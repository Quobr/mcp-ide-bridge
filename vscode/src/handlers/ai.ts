import { BridgeHandler } from '../types';
import { executeStandardAiAction, getAvailableAiActions, StandardAIAction } from '../lab/ai-mapper';

export function createGetAvailableCommandsHandler(): BridgeHandler {
    return {
        action: 'ai.getAvailableCommands',
        description: 'Returns a list of standardized AI actions supported by the current IDE.',
        handle: async (_message, socket) => {
            const actions = getAvailableAiActions();
            socket.write(JSON.stringify({
                success: true,
                data: actions
            }) + '\n');
        }
    };
}

export function createExecuteAiActionHandler(): BridgeHandler {
    return {
        action: 'ai.executeAction',
        description: 'Executes a standardized AI action (e.g., sendToChat) mapped to the specific IDE.',
        handle: async (message, socket) => {
            if (!message.payload?.action) {
                socket.write(JSON.stringify({ success: false, error: 'Missing action field in payload' }) + '\n');
                return;
            }

            const action = message.payload.action as StandardAIAction;
            const args = message.payload.args;

            try {
                await executeStandardAiAction(action, args);
                socket.write(JSON.stringify({ success: true }) + '\n');
            } catch (e: any) {
                socket.write(JSON.stringify({ success: false, error: e.message }) + '\n');
            }
        }
    };
}
