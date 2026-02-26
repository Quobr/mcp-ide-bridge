import * as net from 'net';
import * as vscode from 'vscode';
import { BridgeHandler } from '../types';

export function createConnectionHandler(getSyncCode: () => string): BridgeHandler {
    return {
        action: 'connection_request',
        description: 'Interactive connection request from an AI agent.',
        handle: async (message, socket) => {
            const reqId = message.reqId;
            const syncCode = getSyncCode();

            vscode.window.showInformationMessage(
                `Solicitud de conexión del Agente AI para vincular esta ventana [${syncCode}]`,
                "Conectar Agente Aquí",
                "Cerrar"
            ).then(selection => {
                if (selection === "Conectar Agente Aquí") {
                    socket.write(JSON.stringify({
                        action: 'connection_accepted',
                        reqId,
                        syncCode
                    }) + '\n');
                }
            });
        }
    };
}

export function createConnectionCancelledHandler(): BridgeHandler {
    return {
        action: 'connection_cancelled',
        description: 'Cancels a pending connection request notification.',
        handle: async (_message, _socket) => {
            // VS Code API doesn't allow programmatic dismissal of showInformationMessage.
            // Handler kept for protocol completeness.
        }
    };
}
