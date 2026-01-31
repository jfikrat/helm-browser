// Helm MCP - WebSocket Server Setup

import { WS_PORT, PROTOCOL_VERSION } from "./config.js";
import type { IncomingMessage } from "./types.js";
import {
  proxySessions,
  extensionConnection,
  setExtensionConnection,
  pendingExtensionRequests,
  proxyWindowCache,
} from "./state.js";
import { getSessionList, broadcastSessions } from "./session.js";
import { handleExtensionMessage } from "./handlers.js";
import { writeLockFile } from "./lock.js";

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

// Start WebSocket server (main server mode)
export async function startServer(): Promise<void> {
  writeLockFile();

  Bun.serve({
    port: WS_PORT,
    fetch(req, server) {
      if (server.upgrade(req)) {
        return;
      }
      // HTTP endpoint for health check
      return Response.json({
        status: "ok",
        sessions: getSessionList(),
        extensionConnected: extensionConnection !== null,
        protocolVersion: PROTOCOL_VERSION,
        proxySessionsCount: proxySessions.size,
      });
    },
    websocket: {
      open() {
        console.error("[MCP] New WebSocket connection");
      },
      close(ws) {
        // Check if this was the extension
        if (extensionConnection?.ws === ws) {
          console.error("[MCP] Extension disconnected");

          // Reject all pending extension requests immediately (Fix 4)
          for (const [reqId, pending] of pendingExtensionRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error("Extension disconnected"));
          }
          pendingExtensionRequests.clear();

          setExtensionConnection(null);
          return;
        }

        // Check if this was a proxy session
        for (const [sessionId, info] of proxySessions) {
          if (info.ws === ws) {
            proxySessions.delete(sessionId);
            proxyWindowCache.delete(sessionId); // Fix 5: Clear window cache
            broadcastSessions();
            console.error(`[MCP] Proxy session disconnected: ${sessionId}`);
            return;
          }
        }
      },
      message(ws, rawMessage) {
        try {
          const message = JSON.parse(rawMessage.toString()) as IncomingMessage;

          // Fix 7: Reject duplicate extension connections
          if (message.type === "hello") {
            if (extensionConnection && extensionConnection.ws !== ws) {
              console.error("[MCP] Rejecting duplicate extension connection");
              (ws as any).close(4000, "Extension already connected");
              return;
            }

            if (!extensionConnection) {
              setExtensionConnection({
                ws: ws as unknown as WebSocket,
                profileId: "unknown",
                capabilities: [],
                connectedAt: Date.now(),
              });
              console.error("[MCP] Extension connected");
            }
          }

          handleExtensionMessage(message, ws as unknown as WebSocket);
        } catch (error) {
          console.error("[MCP] Error parsing message:", error);
        }
      },
    },
  });

  console.error(`[MCP] WebSocket server listening on ws://localhost:${WS_PORT}`);
}

// Re-export for backwards compatibility
export { checkExistingServer, removeLockFile } from "./lock.js";
export { startProxyMode } from "./proxy.js";
