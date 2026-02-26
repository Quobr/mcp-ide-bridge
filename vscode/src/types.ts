import * as net from 'net';

// ─── Protocol ───
export const PROTOCOL_VERSION = '0.2';

// ─── IPC Message Types ───
export interface IPCRequest {
    action: string;
    [key: string]: any;
}

export interface IPCResponse {
    success: boolean;
    error?: string;
    [key: string]: any;
}

// ─── Handler ───
export interface BridgeHandler {
    /** The action name this handler responds to */
    action: string;
    /** Human-readable description for introspection */
    description: string;
    /** Handle the incoming IPC message */
    handle: (message: IPCRequest, socket: net.Socket) => Promise<void>;
}

// ─── IDE Context ───
export interface IDEInfo {
    ideType: string;
    syncCode: string;
    protocolVersion: string;
    capabilities: string[];
    workspaceFolders: string[];
}
