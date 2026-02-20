// Helm MCP Daemon - Message Handlers

import { WS_PORT, PROTOCOL_VERSION, REQUEST_TIMEOUT_MS } from "../shared/config.js";
import type {
  ClientMessage,
  ExtensionMessage,
  ResponseMessage,
  ErrorMessage,
  RegisteredMessage,
} from "../shared/protocol.js";
import {
  clientSessions,
  extensionConnection,
  setExtensionConnection,
  pendingRequests,
  tabRouting,
  windowCache,
  registerClient,
  unregisterClient,
  updateClientLastSeen,
  setClientWindowId,
  getSessionList,
  generateRequestId,
  clearAllWindowIds,
} from "./state.js";
import { ensureExtensionConnected } from "./chrome.js";

// ============================================
// Client Message Handler
// ============================================

export async function handleClientMessage(
  message: ClientMessage,
  ws: WebSocket
): Promise<void> {
  switch (message.type) {
    case "register":
      handleRegister(message.sessionId, message.label, ws);
      break;

    case "unregister":
      handleUnregister(message.sessionId);
      break;

    case "command":
      await handleCommand(message, ws);
      break;

    case "keepalive":
      updateClientLastSeen(message.sessionId);
      break;

    default:
      console.error(`[Daemon] Unknown client message type: ${(message as any).type}`);
  }
}

function handleRegister(sessionId: string, label: string, ws: WebSocket): void {
  registerClient(sessionId, label, ws);

  const response: RegisteredMessage = {
    type: "registered",
    sessionId,
    success: true,
  };

  try {
    (ws as any).send(JSON.stringify(response));
  } catch (error) {
    console.error("[Daemon] Failed to send registration response:", error);
  }

  // Broadcast updated session list to extension
  broadcastSessionsToExtension();
}

function handleUnregister(sessionId: string): void {
  // Close window if exists
  const session = clientSessions.get(sessionId);
  if (session?.windowId && extensionConnection) {
    sendToExtension({
      type: "route",
      reqId: generateRequestId(),
      sessionId,
      payload: { command: "close_window", params: { sessionId } },
    });
  }

  unregisterClient(sessionId);
  broadcastSessionsToExtension();
}

async function handleCommand(
  message: { reqId: string; sessionId: string; command: string; params: Record<string, unknown> },
  clientWs: WebSocket
): Promise<void> {
  const { reqId, sessionId, command, params } = message;

  // Ensure extension is connected
  if (!extensionConnection) {
    const connected = await ensureExtensionConnected();
    if (!connected) {
      sendErrorToClient(clientWs, reqId, sessionId, "EXTENSION_NOT_CONNECTED", "Extension not connected and Chrome failed to start");
      return;
    }
  }

  // Ensure session has a window (lazy initialization)
  if (!windowCache.has(sessionId)) {
    try {
      const result = await sendCommandToExtension("create_window", { sessionId }, sessionId);
      if (!(result as any)?.windowId) {
        throw new Error('Window creation failed: no windowId returned');
      }
      setClientWindowId(sessionId, (result as any).windowId);
      console.error(`[Daemon] Lazy window created: ${(result as any).windowId} for session ${sessionId}`);
    } catch (error) {
      console.error(`[Daemon] Failed to create window for session ${sessionId}:`, error);
      sendErrorToClient(clientWs, reqId, sessionId, "WINDOW_CREATION_FAILED", error instanceof Error ? error.message : String(error));
      return;
    }
  }

  // Forward command to extension
  try {
    const result = await sendCommandToExtension(command, params, sessionId);
    sendResponseToClient(clientWs, reqId, sessionId, result);
  } catch (error) {
    sendErrorToClient(
      clientWs,
      reqId,
      sessionId,
      "COMMAND_FAILED",
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================
// Extension Message Handler
// ============================================

export function handleExtensionMessage(
  message: ExtensionMessage,
  ws: WebSocket
): void {
  switch (message.type) {
    case "hello":
      handleExtensionHello(message, ws);
      break;

    case "route_result":
      handleRouteResult(message);
      break;

    case "error":
      handleExtensionError(message);
      break;

    case "tab_closed":
      handleTabClosed(message);
      break;

    case "window_closed":
      handleWindowClosed(message);
      break;

    case "keepalive":
    case "pong":
      // Ignore - connection is alive
      break;

    default:
      // Legacy format support
      if ((message as any).id && (message as any).command) {
        handleLegacyMessage(message);
      } else {
        console.error(`[Daemon] Unknown extension message type: ${message.type}`);
      }
  }
}

function handleExtensionHello(message: ExtensionMessage, ws: WebSocket): void {
  const payload = (message as any).payload || {};

  // Clear all old windowIds - they become invalid after Chrome restart
  clearAllWindowIds();

  setExtensionConnection({
    ws,
    profileId: payload.profileId || "default",
    capabilities: payload.capabilities || [],
    connectedAt: Date.now(),
  });

  // Send welcome message
  sendToExtension({
    type: "welcome",
    payload: {
      serverId: `helm-daemon-${WS_PORT}`,
      protocolVersion: PROTOCOL_VERSION,
      sessions: getSessionList(),
    },
  });

  console.error(`[Daemon] Extension connected, profile: ${payload.profileId || "default"}`);
  broadcastSessionsToExtension();
}

function handleRouteResult(message: ExtensionMessage): void {
  const reqId = (message as any).reqId;
  if (!reqId) return;

  const pending = pendingRequests.get(reqId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(reqId);

    if (message.type === "error") {
      pending.reject(new Error((message as any).payload?.message || "Unknown error"));
    } else {
      pending.resolve((message as any).payload);
    }
  }
}

function handleExtensionError(message: ExtensionMessage): void {
  handleRouteResult(message);
}

function handleTabClosed(message: ExtensionMessage): void {
  const tabId = (message as any).payload?.tabId ?? (message as any).tabId;
  if (tabId !== undefined && tabRouting.has(tabId)) {
    tabRouting.delete(tabId);
    console.error(`[Daemon] Tab ${tabId} removed from routing`);
  }
}

function handleWindowClosed(message: ExtensionMessage): void {
  const { sessionId } = (message as any).payload || {};
  if (sessionId) {
    setClientWindowId(sessionId, null);
    console.error(`[Daemon] Window closed for session ${sessionId}, cache cleared`);
  }
}

function handleLegacyMessage(message: ExtensionMessage): void {
  const reqId = (message as any).id;
  const pending = pendingRequests.get(reqId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(reqId);
    if ((message as any).error) {
      pending.reject(new Error((message as any).error));
    } else {
      pending.resolve((message as any).result);
    }
  }
}

// ============================================
// Helper Functions
// ============================================

function sendToExtension(message: Record<string, unknown>): void {
  if (extensionConnection?.ws) {
    try {
      (extensionConnection.ws as any).send(JSON.stringify(message));
    } catch (error) {
      console.error("[Daemon] Error sending to extension:", error);
    }
  }
}

function sendCommandToExtension(
  command: string,
  params: Record<string, unknown>,
  sessionId: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!extensionConnection?.ws) {
      reject(new Error("Extension not connected"));
      return;
    }

    const reqId = generateRequestId();
    const timeout = setTimeout(() => {
      pendingRequests.delete(reqId);
      reject(new Error("Request timed out"));
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(reqId, { resolve, reject, timeout, sessionId });

    // Include sessionId in params for window isolation
    const paramsWithSession = { ...params, sessionId };

    sendToExtension({
      type: "route",
      reqId,
      sessionId,
      payload: { command, params: paramsWithSession },
    });
  });
}

function sendResponseToClient(
  ws: WebSocket,
  reqId: string,
  sessionId: string,
  payload: unknown
): void {
  const response: ResponseMessage = {
    type: "response",
    reqId,
    sessionId,
    payload,
  };

  try {
    (ws as any).send(JSON.stringify(response));
  } catch (error) {
    console.error("[Daemon] Error sending response to client:", error);
  }
}

function sendErrorToClient(
  ws: WebSocket,
  reqId: string,
  sessionId: string,
  code: string,
  message: string
): void {
  const response: ErrorMessage = {
    type: "error",
    reqId,
    sessionId,
    code,
    message,
  };

  try {
    (ws as any).send(JSON.stringify(response));
  } catch (error) {
    console.error("[Daemon] Error sending error to client:", error);
  }
}

function broadcastSessionsToExtension(): void {
  if (extensionConnection?.ws) {
    sendToExtension({
      type: "sessions",
      payload: {
        sessions: getSessionList(),
        tabRouting: Object.fromEntries(tabRouting),
      },
    });
  }
}

// Export for use in server.ts
export { sendCommandToExtension, sendToExtension };
