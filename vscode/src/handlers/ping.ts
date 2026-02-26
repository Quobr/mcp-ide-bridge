import * as net from 'net';
import { BridgeHandler } from '../types';
import { detectIDE } from '../core/ide-detector';
import { PROTOCOL_VERSION } from '../types';
import { getRegisteredActions } from '../api/handler-registry';
import * as vscode from 'vscode';

// Each handler module exports a factory that receives shared state
export function createPingHandler(getSyncCode: () => string): BridgeHandler {
    return {
        action: 'ping',
        description: 'Health check. Returns IDE info, protocol version, and capabilities.',
        handle: async (_message, socket) => {
            const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [];
            socket.write(JSON.stringify({
                success: true,
                protocolVersion: PROTOCOL_VERSION,
                timestamp: Date.now(),
                ideType: detectIDE(),
                syncCode: getSyncCode(),
                capabilities: getRegisteredActions().map(a => a.name),
                workspaceFolders
            }) + '\n');
        }
    };
}
