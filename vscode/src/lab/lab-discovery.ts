import * as vscode from 'vscode';
import { BridgeHandler } from '../types';
import { detectIDE } from '../core/ide-detector';

// Known AI-related command keywords
const AI_KEYWORDS = [/chat/i, /ai/i, /composer/i, /copilot/i, /generate/i, /inline/i, /agent/i];

export function createLabDiscoveryHandler(): BridgeHandler {
    return {
        action: 'lab.discoverCommands',
        description: '[LAB] Heuristically discovers available VS Code commands, filtering for AI-related capabilities based on the current IDE.',
        handle: async (message, socket) => {
            try {
                // Get all commands
                const allCommands = await vscode.commands.getCommands(true);
                const idePrefix = detectIDE().toLowerCase();

                // Filter commands heuristically
                const aiCommands = allCommands.filter(cmd => {
                    // Always include commands starting with the IDE's specific prefix (e.g. 'antigravity.', 'cursor.')
                    if (cmd.toLowerCase().startsWith(`${idePrefix}.`)) return true;

                    // Otherwise, check if it matches common AI keywords
                    return AI_KEYWORDS.some(regex => regex.test(cmd));
                });

                socket.write(JSON.stringify({
                    success: true,
                    data: {
                        ideType: idePrefix,
                        totalCommands: allCommands.length,
                        discoveredAiCommands: aiCommands.sort()
                    }
                }) + '\n');
            } catch (e: any) {
                socket.write(JSON.stringify({ success: false, error: e.message }) + '\n');
            }
        }
    };
}
