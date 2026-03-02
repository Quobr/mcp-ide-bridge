import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import * as crypto from 'crypto';

// Store active MCP server connection to a specific IDE window
interface IDEContext {
    syncCode: string;
    socketPath: string;
    ideType: string;
}

let activeIdeContext: IDEContext | null = null;

// The type of IDE this server expects to talk to (e.g. 'antigravity', 'cursor', etc.)
const ALLOWED_IDE_TYPE = (process.env.IDE_TYPE || 'antigravity').toLowerCase();
const SOCKET_DIR = path.join(os.homedir(), '.mcp_ide_bridge', 'sockets');

const IDE_TYPE_ALIASES: Record<string, string[]> = {
    vscode: ['vscode', 'vscodium', 'code', 'visual-studio-code'],
    vscodium: ['vscodium', 'vscode', 'codium'],
    codium: ['vscodium', 'vscode', 'codium'],
};

function getAcceptedIdeTypes(rawIdeType: string): Set<string> {
    const normalized = rawIdeType.trim().toLowerCase();
    const accepted = IDE_TYPE_ALIASES[normalized] || [normalized];
    return new Set(accepted);
}

const server = new Server(
    {
        name: 'mcp_ide_mcp_example',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

/**
 * Scans the sockets directory and pings each to find alive sessions.
 * Cleans up dead socket files.
 */
async function scanAliveSessions(): Promise<IDEContext[]> {
    if (!fs.existsSync(SOCKET_DIR)) {
        return [];
    }

    const files = fs.readdirSync(SOCKET_DIR).filter(f => f.endsWith('.sock'));
    const sessions: IDEContext[] = [];

    for (const file of files) {
        const fullPath = path.join(SOCKET_DIR, file);
        // Expecting format: <ideType>-<syncCode>-<pid>.sock
        const parts = file.replace('.sock', '').split('-');
        if (parts.length < 2) continue;

        const ideType = parts[0];
        const syncCode = parts[1];

        try {
            // Ping to verify it's still listening
            const response = await sendIPCMessage(fullPath, { action: 'ping' }, 500);
            if (response.success) {
                sessions.push({
                    syncCode,
                    socketPath: fullPath,
                    ideType: ideType.toLowerCase()
                });
            }
        } catch (e) {
            // If ping fails (ECONNREFUSED, etc), cleanup the dead socket file
            try {
                fs.unlinkSync(fullPath);
            } catch { }
        }
    }
    return sessions;
}

/**
 * Helper to send a single IPC message and get a response.
 */
function sendIPCMessage(socketPath: string, message: any, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ path: socketPath }, () => {
            client.write(JSON.stringify(message) + '\n');
        });

        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('IPC request timed out'));
        }, timeoutMs);

        let receivedData = '';
        client.on('data', (data) => {
            receivedData += data.toString();
            if (receivedData.includes('\n')) {
                const responseStr = receivedData.split('\n')[0];
                try {
                    const response = JSON.parse(responseStr);
                    clearTimeout(timeout);
                    client.end();
                    resolve(response);
                } catch (e) {
                    // Ignore malformed JSON until we get a full line
                }
            }
        });

        client.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'request_ide_connection',
                description: 'Requests a connection to an active IDE window. This will show a "Connect Agent Here" button in all open windows of the configured IDE type.',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'connect_ide',
                description: 'Manual fallback to connect via syncCode if needed.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        syncCode: { type: 'string', description: 'The 4-character Sync Code.' }
                    },
                    required: ['syncCode']
                }
            },
            {
                name: 'ide_open_file',
                description: 'Opens a file in the actively connected IDE window.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uri: { type: 'string', description: 'Absolute path or URI.' }
                    },
                    required: ['uri']
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'request_ide_connection') {
        const sessions = await scanAliveSessions();
        const acceptedIdeTypes = getAcceptedIdeTypes(ALLOWED_IDE_TYPE);
        const filtered = sessions.filter(s => acceptedIdeTypes.has(s.ideType));

        if (filtered.length === 0) {
            const acceptedText = Array.from(getAcceptedIdeTypes(ALLOWED_IDE_TYPE)).join(', ');
            return {
                content: [{ type: 'text', text: `No active IDE windows found for IDE_TYPE='${ALLOWED_IDE_TYPE}'. Accepted socket ids: ${acceptedText}.` }],
                isError: true
            };
        }

        const reqId = crypto.randomBytes(4).toString('hex');

        // Broadcast to all filtered IDEs and wait for the first one to accept
        const connectionPromise = new Promise<{ syncCode: string, socketPath: string }>((resolve, reject) => {
            const clients: net.Socket[] = [];
            let resolved = false;

            const timeout = setTimeout(() => {
                if (!resolved) {
                    clients.forEach(c => c.destroy());
                    reject(new Error('No window accepted the connection within 60 seconds.'));
                }
            }, 60000);

            filtered.forEach(s => {
                const client = net.createConnection({ path: s.socketPath }, () => {
                    client.write(JSON.stringify({ action: 'connection_request', reqId }) + '\n');
                });
                clients.push(client);

                client.on('data', (data) => {
                    try {
                        const msg = JSON.parse(data.toString().split('\n')[0]);
                        if (msg.action === 'connection_accepted' && msg.reqId === reqId) {
                            resolved = true;
                            clearTimeout(timeout);
                            // Cleanup others
                            clients.forEach(c => { if (c !== client) c.destroy(); });
                            client.end();
                            resolve({ syncCode: msg.syncCode, socketPath: s.socketPath });
                        }
                    } catch (e) { }
                });

                client.on('error', () => { /* Ignore individual client errors */ });
            });
        });

        try {
            const winner = await connectionPromise;
            activeIdeContext = {
                ...winner,
                ideType: ALLOWED_IDE_TYPE
            };

            // Send cancellation to all others so they close their notification
            for (const s of filtered) {
                if (s.socketPath !== winner.socketPath) {
                    sendIPCMessage(s.socketPath, { action: 'connection_cancelled', reqId }).catch(() => { });
                }
            }

            return {
                content: [{ type: 'text', text: `Successfully connected to IDE window [${winner.syncCode}]` }]
            };
        } catch (e: any) {
            return { content: [{ type: 'text', text: `Connection failed: ${e.message}` }], isError: true };
        }
    }

    if (name === 'connect_ide') {
        const { syncCode } = args as any;
        const sessions = await scanAliveSessions();
        const session = sessions.find(s => s.syncCode === syncCode);

        if (!session) {
            return { content: [{ type: 'text', text: `Sync Code '${syncCode}' not found among active sessions.` }], isError: true };
        }

        activeIdeContext = session;
        return { content: [{ type: 'text', text: `Manual connection established to [${syncCode}]` }] };
    }

    if (name === 'ide_open_file') {
        if (!activeIdeContext) {
            return { content: [{ type: 'text', text: "Error: No active IDE connection. Call 'request_ide_connection' first." }], isError: true };
        }

        const { uri } = args as any;
        let fileUri = uri;
        if (!uri.startsWith('file://')) {
            fileUri = `file://${path.resolve(uri)}`;
        }

        try {
            const response = await sendIPCMessage(activeIdeContext.socketPath, {
                action: 'openDocument',
                uri: fileUri
            });

            if (response.success) {
                return { content: [{ type: 'text', text: `Opened ${fileUri} in window [${activeIdeContext.syncCode}]` }] };
            } else {
                return { content: [{ type: 'text', text: `IDE error: ${response.error}` }], isError: true };
            }
        } catch (e: any) {
            return { content: [{ type: 'text', text: `IPC error: ${e.message}` }], isError: true };
        }
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`mcp_ide_mcp_example (${ALLOWED_IDE_TYPE}) running on stdio`);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
