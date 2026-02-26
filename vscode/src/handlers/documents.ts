import * as vscode from 'vscode';
import { BridgeHandler } from '../types';

export function createOpenDocumentHandler(): BridgeHandler {
    return {
        action: 'openDocument',
        description: 'Opens a file in the editor by URI.',
        handle: async (message, socket) => {
            if (!message.uri) {
                socket.write(JSON.stringify({ success: false, error: 'Missing uri field' }) + '\n');
                return;
            }
            const uri = vscode.Uri.parse(message.uri);
            await vscode.commands.executeCommand('vscode.open', uri);
            socket.write(JSON.stringify({ success: true }) + '\n');
        }
    };
}
