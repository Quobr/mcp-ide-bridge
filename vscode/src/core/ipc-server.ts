import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { getHandler } from '../api/handler-registry';
import { detectIDE } from './ide-detector';

const SOCKET_DIR = path.join(os.homedir(), '.mcp_ide_bridge', 'sockets');

let ipcServer: net.Server | undefined;
let currentSocketPath: string | undefined;

/**
 * Starts the IPC server with the standardized socket naming convention.
 */
export function startIPCServer(syncCode: string): void {
    const ideType = detectIDE().toLowerCase();
    const pid = process.pid;

    // Ensure the socket directory exists
    if (!fs.existsSync(SOCKET_DIR)) {
        fs.mkdirSync(SOCKET_DIR, { recursive: true });
    }

    // Naming convention: <ideType>-<syncCode>-<pid>.sock
    currentSocketPath = path.join(SOCKET_DIR, `${ideType}-${syncCode}-${pid}.sock`);

    // Cleanup leftover socket from a crash
    if (fs.existsSync(currentSocketPath)) {
        try { fs.unlinkSync(currentSocketPath); } catch (e) {
            console.warn(`Failed to unlink existing socket ${currentSocketPath}`, e);
        }
    }

    ipcServer = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', async (data) => {
            buffer += data.toString();

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const messageString = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (messageString.trim() === '') continue;

                try {
                    const message = JSON.parse(messageString);
                    await routeMessage(message, socket);
                } catch (e: any) {
                    console.error('Failed to parse IPC message:', e);
                    socket.write(JSON.stringify({ success: false, error: 'Invalid JSON', details: e.message }) + '\n');
                }
            }
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    });

    ipcServer.on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Socket ${currentSocketPath} is already in use.`);
            vscode.window.showErrorMessage(`MCP IDE Bridge failed to start: Port in use.`);
        } else {
            console.error('IPC Server error:', e);
        }
    });

    ipcServer.listen(currentSocketPath, () => {
        console.log(`MCP IDE Bridge IPC Server listening on ${currentSocketPath}`);
    });
}

/**
 * Stops the IPC server and cleans up the socket file.
 */
export function stopIPCServer(): void {
    if (ipcServer) {
        ipcServer.close();
        ipcServer = undefined;
    }
    if (currentSocketPath && fs.existsSync(currentSocketPath)) {
        try { fs.unlinkSync(currentSocketPath); } catch (e) {
            console.error('Failed to cleanup socket file:', e);
        }
    }
}

/**
 * Returns the current socket path for status display.
 */
export function getSocketPath(): string | undefined {
    return currentSocketPath;
}

/**
 * Routes an incoming IPC message to the appropriate registered handler.
 */
async function routeMessage(message: any, socket: net.Socket): Promise<void> {
    if (!message.action) {
        socket.write(JSON.stringify({ success: false, error: 'Missing action field' }) + '\n');
        return;
    }

    const handler = getHandler(message.action);
    if (!handler) {
        socket.write(JSON.stringify({ success: false, error: `Unknown action: ${message.action}` }) + '\n');
        return;
    }

    try {
        await handler.handle(message, socket);
    } catch (e: any) {
        socket.write(JSON.stringify({ success: false, error: e.message }) + '\n');
    }
}
