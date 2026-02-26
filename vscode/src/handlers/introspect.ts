import { BridgeHandler, PROTOCOL_VERSION } from '../types';
import { getRegisteredActions } from '../api/handler-registry';

export function createIntrospectHandler(): BridgeHandler {
    return {
        action: 'introspect',
        description: 'Returns all registered actions and their descriptions. Used for dynamic capability discovery.',
        handle: async (_message, socket) => {
            socket.write(JSON.stringify({
                success: true,
                protocolVersion: PROTOCOL_VERSION,
                actions: getRegisteredActions()
            }) + '\n');
        }
    };
}
