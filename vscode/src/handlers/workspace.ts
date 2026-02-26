import * as vscode from 'vscode';
import { BridgeHandler, PROTOCOL_VERSION } from '../types';
import { detectIDE } from '../core/ide-detector';

export function createGetWorkspaceInfoHandler(getSyncCode: () => string): BridgeHandler {
    return {
        action: 'getWorkspaceInfo',
        description: 'Returns workspace folders, active file, IDE version, and protocol version.',
        handle: async (_message, socket) => {
            const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [];
            const activeEditor = vscode.window.activeTextEditor;
            const activeFile = activeEditor?.document.uri.fsPath || null;
            const ideVersion = vscode.version;
            const ideType = detectIDE();

            socket.write(JSON.stringify({
                success: true,
                protocolVersion: PROTOCOL_VERSION,
                ideType,
                ideVersion,
                syncCode: getSyncCode(),
                workspaceFolders,
                activeFile,
                openEditors: vscode.window.tabGroups.all.flatMap(g =>
                    g.tabs
                        .filter(t => t.input && (t.input as any).uri)
                        .map(t => (t.input as any).uri.fsPath)
                )
            }) + '\n');
        }
    };
}
