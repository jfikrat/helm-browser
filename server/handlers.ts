// Helm MCP - Message Handlers

import { WS_PORT, PROTOCOL_VERSION } from "./config.js";
import type { IncomingMessage } from "./types.js";
import {
  sessions,
  proxySessions,
  tabRouting,
  defaultSessionId,
  extensionConnection,
  pendingExtensionRequests,
  proxyWindowCache,
} from "./state.js";
import { sendToExtension, sendCommandToExtension } from "./commands.js";
import { getSessionList, broadcastSessions } from "./session.js";

// Main message router for extension/proxy messages
export function handleExtensionMessage(
  message: IncomingMessage,
  ws: WebSocket
): void {
  // Handle proxy registration
  if (message.type === "register_proxy_session") {
    const payload = message.payload || {};
    const sessionId = payload.sessionId as string;
    const label = (payload.label as string) || "Proxy Session";

    proxySessions.set(sessionId, { ws, label });
    broadcastSessions();
    console.error(`[MCP] Proxy session registered: ${sessionId} (${label})`);
    return;
  }

  // Handle proxy commands (forward to extension)
  if (message.type === "proxy_command") {
    handleProxyCommand(message, ws);
    return;
  }

  // Fix 9: Handle graceful proxy session unregister
  if (message.type === "unregister_proxy_session") {
    const sessionId = (message.payload as { sessionId?: string })?.sessionId;
    if (sessionId && proxySessions.has(sessionId)) {
      proxySessions.delete(sessionId);
      proxyWindowCache.delete(sessionId);
      broadcastSessions();
      console.error(`[MCP] Proxy session unregistered: ${sessionId}`);
    }
    return;
  }

  // Legacy format support
  if (message.id && message.command) {
    handleLegacyMessage(message);
    return;
  }

  switch (message.type) {
    case "hello":
      handleHello(message).catch((e) =>
        console.error("[MCP] handleHello error:", e)
      );
      break;
    case "list_sessions":
      handleListSessions(message);
      break;
    case "select_session":
      handleSelectSession(message);
      break;
    case "route_result":
      handleRouteResult(message);
      break;
    case "error":
      handleExtensionError(message);
      break;
    case "keepalive":
      break;
    case "tab_closed":
      handleTabClosed(message);
      break;
    default:
      console.error(`[MCP] Unknown message type: ${message.type}`);
  }
}

// Fix 8: Handle tab closed event - cleanup routing
function handleTabClosed(message: IncomingMessage): void {
  const tabId = (message.payload as { tabId?: number })?.tabId ?? (message as any).tabId;
  if (tabId !== undefined && tabRouting.has(tabId)) {
    tabRouting.delete(tabId);
    console.error(`[MCP] Tab ${tabId} removed from routing`);
  }
}

// Forward proxy command to extension
async function handleProxyCommand(
  message: IncomingMessage,
  proxyWsConn: WebSocket
): Promise<void> {
  const { reqId, sessionId, payload } = message;
  const { command, params } = (payload || {}) as {
    command: string;
    params: Record<string, unknown>;
  };

  try {
    // Fix 5: Only create window if not already cached
    if (sessionId && !proxyWindowCache.has(sessionId)) {
      await sendCommandToExtension("create_window", { sessionId }, sessionId);
      proxyWindowCache.add(sessionId);
    }

    // sessionId'yi extension'a ilet (window isolation için)
    const result = await sendCommandToExtension(command, params || {}, sessionId);

    (proxyWsConn as any).send(
      JSON.stringify({
        type: "proxy_response",
        reqId,
        sessionId,
        payload: result,
      })
    );
  } catch (error) {
    (proxyWsConn as any).send(
      JSON.stringify({
        type: "proxy_error",
        reqId,
        sessionId,
        payload: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
  }
}

// Handle extension hello message
async function handleHello(message: IncomingMessage): Promise<void> {
  const payload = message.payload || {};
  if (extensionConnection) {
    (extensionConnection as any).profileId =
      (payload.profileId as string) || "default";
    (extensionConnection as any).capabilities =
      (payload.capabilities as string[]) || [];
  }

  sendToExtension({
    type: "welcome",
    payload: {
      serverId: `mcp-${WS_PORT}`,
      protocolVersion: PROTOCOL_VERSION,
      sessions: getSessionList(),
      defaultSessionId,
    },
  });

  console.error(
    `[MCP] Extension hello received, profile: ${extensionConnection?.profileId}`
  );

  // Windows are now created lazily on first tool use (see ensureSessionWindow in session.ts)
  broadcastSessions();
}

// Handle list sessions request
function handleListSessions(message: IncomingMessage): void {
  sendToExtension({
    type: "sessions",
    reqId: message.reqId,
    payload: {
      sessions: getSessionList(),
      defaultSessionId,
      tabRouting: Object.fromEntries(tabRouting),
    },
  });
}

// Handle tab-to-session assignment
function handleSelectSession(message: IncomingMessage): void {
  const payload = message.payload || {};
  const tabId = payload.tabId as number | undefined;
  const sessionId = payload.sessionId as string;

  if (tabId !== undefined && sessionId) {
    const sessionExists =
      sessions.has(sessionId) || proxySessions.has(sessionId);
    if (sessionExists) {
      tabRouting.set(tabId, sessionId);
      sendToExtension({
        type: "session_selected",
        reqId: message.reqId,
        payload: { tabId, sessionId, success: true },
      });
      console.error(`[MCP] Tab ${tabId} → Session ${sessionId}`);
    } else {
      sendToExtension({
        type: "error",
        reqId: message.reqId,
        payload: {
          code: "SESSION_NOT_FOUND",
          message: `Session ${sessionId} not found`,
        },
      });
    }
  }
}

// Handle command result from extension
function handleRouteResult(message: IncomingMessage): void {
  const reqId = message.reqId;
  if (!reqId) return;

  // Check pending extension requests first
  const pending = pendingExtensionRequests.get(reqId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingExtensionRequests.delete(reqId);
    if (message.type === "error") {
      pending.reject(
        new Error((message.payload as any)?.message || "Unknown error")
      );
    } else {
      pending.resolve(message.payload);
    }
    return;
  }

  // Check session pending requests
  const sessionId = message.sessionId;
  if (!sessionId) return;

  const session = sessions.get(sessionId);
  if (!session) return;

  const sessionPending = session.pendingRequests.get(reqId);
  if (sessionPending) {
    clearTimeout(sessionPending.timeout);
    session.pendingRequests.delete(reqId);
    if (message.type === "error") {
      sessionPending.reject(
        new Error((message.payload as any)?.message || "Unknown error")
      );
    } else {
      sessionPending.resolve(message.payload);
    }
  }
}

// Handle extension error
function handleExtensionError(message: IncomingMessage): void {
  handleRouteResult(message);
}

// Handle legacy message format
function handleLegacyMessage(message: IncomingMessage): void {
  const reqId = message.id!;
  const pending = pendingExtensionRequests.get(reqId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingExtensionRequests.delete(reqId);
    if ((message as any).error) {
      pending.reject(new Error((message as any).error));
    } else {
      pending.resolve((message as any).result);
    }
  }
}
