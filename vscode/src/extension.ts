import * as vscode from 'vscode';
import { generateSyncCode } from './core/sync-code';
import { startIPCServer, stopIPCServer, getSocketPath } from './core/ipc-server';
import { registerHandler, unregisterHandler, clearHandlers } from './api/handler-registry';

// Built-in handlers
import { createPingHandler } from './handlers/ping';
import { createConnectionHandler, createConnectionCancelledHandler } from './handlers/connection';
import { createOpenDocumentHandler } from './handlers/documents';
import { createExecuteCommandHandler } from './handlers/commands';
import { createExecuteAiActionHandler, createGetAvailableCommandsHandler } from './handlers/ai';
import { createGetWorkspaceInfoHandler } from './handlers/workspace';
import { createIntrospectHandler } from './handlers/introspect';
import { createLabDiscoveryHandler } from './lab/lab-discovery';
import { createLabFuzzCommandHandler } from './lab/command-fuzzer';

let syncCode: string;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('MCP IDE Bridge v0.2 is now active!');

    // 1. Generate Sync Code
    syncCode = generateSyncCode();
    const getSyncCode = () => syncCode;

    // 2. Register all built-in handlers
    registerHandler(createPingHandler(getSyncCode));
    registerHandler(createConnectionHandler(getSyncCode));
    registerHandler(createConnectionCancelledHandler());
    registerHandler(createOpenDocumentHandler());
    registerHandler(createExecuteCommandHandler());
    registerHandler(createExecuteAiActionHandler());
    registerHandler(createGetAvailableCommandsHandler());
    registerHandler(createGetWorkspaceInfoHandler(getSyncCode));
    registerHandler(createIntrospectHandler());

    // Lab Handlers
    registerHandler(createLabDiscoveryHandler());
    registerHandler(createLabFuzzCommandHandler());

    // 3. Create Status Bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(plug) MCP: ${syncCode}`;
    statusBarItem.tooltip = `MCP Sync Code\nClick to copy`;
    statusBarItem.command = 'mcp-ide-bridge.copySyncCode';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 4. Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-ide-bridge.status', () => {
            const socketPath = getSocketPath();
            const status = socketPath ? `Running on: ${socketPath}` : 'Not running';
            vscode.window.showInformationMessage(`MCP IDE Bridge Status: ${status} | Sync Code: ${syncCode}`);
        }),
        vscode.commands.registerCommand('mcp-ide-bridge.copySyncCode', async () => {
            await vscode.env.clipboard.writeText(syncCode);
            vscode.window.showInformationMessage(`Copied MCP Sync Code to clipboard: ${syncCode}`);
        })
    );

    // 5. Start IPC Server
    startIPCServer(syncCode);

    // 6. Return Public API for other extensions
    return {
        registerHandler,
        unregisterHandler,
        getSyncCode
    };
}

export function deactivate() {
    console.log('MCP IDE Bridge is deactivating...');
    stopIPCServer();
    clearHandlers();
}

// ─── Public API ───
// Re-export for use by other extensions
export { registerHandler, unregisterHandler } from './api/handler-registry';
export type { BridgeHandler } from './types';
