import * as vscode from 'vscode';
import { detectIDE } from '../core/ide-detector';

// Define standardized AI actions
export type StandardAIAction =
    | 'sendToChat'
    | 'openComposer'
    | 'inlineCompletion'
    | 'applyDiff'
    | 'agentPanel.open'
    | 'agentPanel.remove'
    | 'agentPanel.toggle'
    | 'agentPanel.reset'
    | 'agentPanel.newConversation';

// Polyfill map matching semantic actions to specific IDE native commands
const AI_CAPABILITIES: Record<string, Partial<Record<StandardAIAction, string>>> = {
    'antigravity': {
        sendToChat: 'antigravity.sendPromptToAgentPanel',
        openComposer: 'antigravity.openComposer', // Assumed/Hypothetical if we expand antigravity
        'agentPanel.open': 'antigravity.agentSidePanel.open', // Opens the agent side panel view
        'agentPanel.remove': 'antigravity.agentSidePanel.removeView', // Collapses/Destroys the chat panel to save resources
        'agentPanel.toggle': 'antigravity.agentSidePanel.toggleVisibility', // Hides/Shows without losing context
        'agentPanel.reset': 'antigravity.agentSidePanel.resetViewLocation',
        'agentPanel.newConversation': 'antigravity.startNewConversation'
    },
    'cursor': {
        sendToChat: 'cursor.chat.send',
        openComposer: 'cursor.composer.open',
        inlineCompletion: 'cursor.inline.generate'
    },
    'windsurf': {
        sendToChat: 'windsurf.chat.send',
        openComposer: 'windsurf.composer.open'
    },
    'pearai': {
        sendToChat: 'pearai.chat.send'
    },
    'cline': {
        sendToChat: 'cline.chat.send'
    }
    // Add more IDE mappings here as crowdsourced
};

/**
 * Returns a list of standardized actions that are strictly mapped for the current IDE.
 */
export function getAvailableAiActions(): StandardAIAction[] {
    const ide = detectIDE().toLowerCase();
    const mappedCommands = AI_CAPABILITIES[ide];

    if (!mappedCommands) {
        return [];
    }

    return Object.keys(mappedCommands) as StandardAIAction[];
}

/**
 * Executes a standardized AI Action, abstracting away the underlying IDE's API.
 * Uses fallback heuristics if the exact command isn't mapped.
 */
export async function executeStandardAiAction(action: StandardAIAction, payload?: any): Promise<any> {
    const ide = detectIDE().toLowerCase();

    // 1. Try rigid static mapping
    const mappedCommand = AI_CAPABILITIES[ide]?.[action];

    if (mappedCommand) {
        return executeWrapped(ide, mappedCommand, action, payload);
    }

    // 2. Try Heuristic Fallback based on Action
    const heuristicCommand = inferHeuristicCommand(ide, action);
    if (heuristicCommand) {
        try {
            return await executeWrapped(ide, heuristicCommand, action, payload);
        } catch (e: any) {
            console.warn(`Heuristic command ${heuristicCommand} failed:`, e);
        }
    }

    throw new Error(`AI Capability '${action}' is not mapped or heuristically found for IDE: ${ide}`);
}

async function executeWrapped(ide: string, commandId: string, action: StandardAIAction, payload?: any): Promise<any> {
    // Specialized payload wrapping for strict IDEs like Antigravity
    let finalPayload = payload;

    if (ide === 'antigravity') {
        if (action === 'sendToChat') {
            // Antigravity's sendPromptToAgentPanel expects a strictly JSON-parseable string
            // Plain text ("hello") fails because it expects a JSON token.
            // Converting it to a JSON string literal (e.g. '"hello"') or an object works.
            finalPayload = typeof payload === 'string' ? JSON.stringify(payload) : JSON.stringify(payload);
        }
    }

    if (finalPayload !== undefined) {
        return vscode.commands.executeCommand(commandId, finalPayload);
    }
    return vscode.commands.executeCommand(commandId);
}

function inferHeuristicCommand(ide: string, action: StandardAIAction): string | null {
    if (action === 'sendToChat') return `${ide}.chat.send`;
    if (action === 'openComposer') return `${ide}.composer.open`;
    return null;
}
