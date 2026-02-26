import * as vscode from 'vscode';
import { BridgeHandler } from '../types';

export function createLabFuzzCommandHandler(): BridgeHandler {
    return {
        action: 'lab.fuzzCommand',
        description: '[LAB] Attempts to execute a raw VS Code command with the provided payload. Returns success status or the raw exception trace to aid empirical discovery of required parameters.',
        handle: async (message, socket) => {
            const commandId = message.payload?.commandId;
            const args = message.payload?.args;

            if (!commandId || typeof commandId !== 'string') {
                socket.write(JSON.stringify({
                    success: false,
                    error: 'Valid commandId string is required in payload.'
                }) + '\n');
                return;
            }

            try {
                // Fuzz execution
                let result;
                if (args !== undefined) {
                    // Spread args if it's an array, otherwise pass as a single object
                    if (Array.isArray(args)) {
                        result = await vscode.commands.executeCommand(commandId, ...args);
                    } else {
                        result = await vscode.commands.executeCommand(commandId, args);
                    }
                } else {
                    result = await vscode.commands.executeCommand(commandId);
                }

                // If execution succeeds without throwing
                socket.write(JSON.stringify({
                    success: true,
                    data: {
                        message: `Command '${commandId}' executed successfully.`,
                        returned: result
                    }
                }) + '\n');

            } catch (e: any) {
                // This is the core of the empirical fuzzer: returning the exact stack trace / error from TypeScript
                socket.write(JSON.stringify({
                    success: false,
                    error: e.message,
                    stack: e.stack,
                    fuzzNote: 'Analyze this exception to infer the expected payload schema.'
                }) + '\n');
            }
        }
    };
}
