import * as vscode from 'vscode';
import { BridgeHandler } from '../types';

export function createExecuteCommandHandler(): BridgeHandler {
    return {
        action: 'executeCommand',
        description: 'Executes an arbitrary VS Code command with optional arguments.',
        handle: async (message, socket) => {
            if (!message.command) {
                socket.write(JSON.stringify({ success: false, error: 'Missing command field' }) + '\n');
                return;
            }
            const args = message.args || [];
            const result = await vscode.commands.executeCommand(message.command, ...args);
            socket.write(JSON.stringify({ success: true, result }) + '\n');
        }
    };
}
