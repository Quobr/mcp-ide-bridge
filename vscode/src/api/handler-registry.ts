import { BridgeHandler } from '../types';

const handlers = new Map<string, BridgeHandler>();

/**
 * Register a handler for an IPC action.
 * Can be called by the bridge itself or by external extensions.
 */
export function registerHandler(handler: BridgeHandler): void {
    if (handlers.has(handler.action)) {
        console.warn(`[Bridge Registry] Overwriting handler for action: ${handler.action}`);
    }
    handlers.set(handler.action, handler);
    console.log(`[Bridge Registry] Registered: ${handler.action}`);
}

/**
 * Unregister a handler by action name.
 */
export function unregisterHandler(action: string): void {
    handlers.delete(action);
}

/**
 * Get a handler by action name.
 */
export function getHandler(action: string): BridgeHandler | undefined {
    return handlers.get(action);
}

/**
 * Get all registered action names and descriptions (for introspection).
 */
export function getRegisteredActions(): { name: string; description: string }[] {
    return Array.from(handlers.values()).map(h => ({
        name: h.action,
        description: h.description
    }));
}

/**
 * Clear all handlers (for testing or deactivation).
 */
export function clearHandlers(): void {
    handlers.clear();
}
