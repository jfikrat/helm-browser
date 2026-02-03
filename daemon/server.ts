// Helm MCP Daemon - WebSocket Server

import { WS_PORT, PROTOCOL_VERSION, CLIENT_KEEPALIVE_TIMEOUT_MS } from "../shared/config.js";
import type { ClientMessage, ExtensionMessage } from "../shared/protocol.js";
import {
  clientSessions,
  extensionConnection,
  setExtensionConnection,
  pendingRequests,
  unregisterClient,
  getSessionList,
} from "./state.js";
import { handleClientMessage, handleExtensionMessage } from "./handlers.js";

declare const Bun: {
  serve(options: {
    port: number;
    fetch: (
      req: Request,
      server: { upgrade: (req: Request) => boolean }
    ) => Response | undefined;
    websocket: {
      open?: (ws: unknown) => void;
      close?: (ws: unknown) => void;
      message: (ws: unknown, message: string | ArrayBuffer) => void;
    };
  }): unknown;
};

// Client stale check interval
let staleCheckInterval: ReturnType<typeof setInterval> | null = null;

// Extension ping interval (keeps Service Worker alive)
const EXTENSION_PING_INTERVAL_MS = 25000;
let extensionPingInterval: ReturnType<typeof setInterval> | null = null;

// Start pinging extension to keep Service Worker alive
function startExtensionPing(): void {
  if (extensionPingInterval) return;

  extensionPingInterval = setInterval(() => {
    if (extensionConnection?.ws) {
      try {
        (extensionConnection.ws as any).send(JSON.stringify({ type: "ping" }));
      } catch (e) {
        // Connection lost, will be handled by close event
      }
    }
  }, EXTENSION_PING_INTERVAL_MS);
}

// Stop pinging extension
function stopExtensionPing(): void {
  if (extensionPingInterval) {
    clearInterval(extensionPingInterval);
    extensionPingInterval = null;
  }
}

// Start the WebSocket server
export async function startServer(): Promise<void> {
  Bun.serve({
    port: WS_PORT,
    fetch(req, server) {
      if (server.upgrade(req)) {
        return;
      }
      // HTTP endpoint for health check and status
      return Response.json({
        status: "ok",
        mode: "daemon",
        protocolVersion: PROTOCOL_VERSION,
        extensionConnected: extensionConnection !== null,
        clientCount: clientSessions.size,
        sessions: getSessionList(),
      });
    },
    websocket: {
      open() {
        console.error("[Daemon] New WebSocket connection");
      },

      close(ws) {
        // Check if this was the extension
        if (extensionConnection?.ws === ws) {
          console.error("[Daemon] Extension disconnected");

          // Reject all pending extension requests
          for (const [reqId, pending] of pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error("Extension disconnected"));
          }
          pendingRequests.clear();

          setExtensionConnection(null);
          return;
        }

        // Check if this was a client session
        for (const [sessionId, session] of clientSessions) {
          if (session.ws === ws) {
            unregisterClient(sessionId);
            console.error(`[Daemon] Client disconnected: ${sessionId}`);
            return;
          }
        }
      },

      message(ws, rawMessage) {
        try {
          const message = JSON.parse(rawMessage.toString());

          // Determine message source based on type
          if (message.type === "hello") {
            // Extension connecting
            if (extensionConnection && extensionConnection.ws !== ws) {
              console.error("[Daemon] Rejecting duplicate extension connection");
              (ws as any).close(4000, "Extension already connected");
              return;
            }
            handleExtensionMessage(message as ExtensionMessage, ws as unknown as WebSocket);
          } else if (message.type === "register" || message.type === "command" || message.type === "unregister" || message.type === "keepalive") {
            // Client message
            handleClientMessage(message as ClientMessage, ws as unknown as WebSocket);
          } else if (message.type === "route_result" || message.type === "error" || message.type === "tab_closed") {
            // Extension result/error
            handleExtensionMessage(message as ExtensionMessage, ws as unknown as WebSocket);
          } else {
            // Try to determine by content
            if (message.sessionId && (message.command || message.reqId)) {
              handleClientMessage(message as ClientMessage, ws as unknown as WebSocket);
            } else {
              handleExtensionMessage(message as ExtensionMessage, ws as unknown as WebSocket);
            }
          }
        } catch (error) {
          console.error("[Daemon] Error parsing message:", error);
        }
      },
    },
  });

  // Start stale client cleanup
  staleCheckInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of clientSessions) {
      if (now - session.lastSeen > CLIENT_KEEPALIVE_TIMEOUT_MS) {
        console.error(`[Daemon] Removing stale client: ${sessionId}`);
        unregisterClient(sessionId);
      }
    }
  }, CLIENT_KEEPALIVE_TIMEOUT_MS / 2);

  // Start extension ping (keeps Service Worker alive)
  startExtensionPing();

  console.error(`[Daemon] WebSocket server listening on ws://localhost:${WS_PORT}`);
}

// Stop the server and cleanup
export function stopServer(): void {
  if (staleCheckInterval) {
    clearInterval(staleCheckInterval);
    staleCheckInterval = null;
  }

  stopExtensionPing();

  // Close all client connections
  for (const [sessionId, session] of clientSessions) {
    try {
      (session.ws as any).close(1000, "Daemon shutting down");
    } catch (e) {
      // Ignore
    }
  }
  clientSessions.clear();

  // Close extension connection
  if (extensionConnection) {
    try {
      (extensionConnection.ws as any).close(1000, "Daemon shutting down");
    } catch (e) {
      // Ignore
    }
    setExtensionConnection(null);
  }

  console.error("[Daemon] Server stopped");
}
