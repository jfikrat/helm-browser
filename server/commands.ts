// Helm MCP - Command Routing

import { REQUEST_TIMEOUT_MS } from "./config.js";
import {
  isProxyMode,
  proxyWs,
  mySessionId,
  extensionConnection,
  pendingExtensionRequests,
  proxyPendingRequests,
  incrementRequestId,
} from "./state.js";
import { ensureExtensionConnected } from "./chrome.js";

// Send message to extension
export function sendToExtension(message: Record<string, unknown>): void {
  if (extensionConnection?.ws) {
    try {
      (extensionConnection.ws as any).send(JSON.stringify(message));
    } catch (error) {
      console.error("[MCP] Error sending to extension:", error);
    }
  }
}

// Send command through proxy to main server
export function sendProxyCommand(
  command: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!proxyWs || (proxyWs as any).readyState !== WebSocket.OPEN) {
      reject(new Error("Proxy not connected"));
      return;
    }

    const reqId = `proxy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timeout = setTimeout(() => {
      proxyPendingRequests.delete(reqId);
      reject(new Error("Proxy request timed out"));
    }, REQUEST_TIMEOUT_MS);

    proxyPendingRequests.set(reqId, { resolve, reject, timeout });

    (proxyWs as any).send(
      JSON.stringify({
        type: "proxy_command",
        reqId,
        sessionId: mySessionId,
        payload: { command, params },
      })
    );
  });
}

// Send command to extension (with auto-start Chrome)
export async function sendCommandToExtension(
  command: string,
  params: Record<string, unknown>,
  sessionId?: string | null
): Promise<unknown> {
  // Auto-start Chrome if extension not connected
  if (!extensionConnection?.ws) {
    console.error("[MCP] Extension not connected, attempting to start Chrome...");
    const connected = await ensureExtensionConnected();
    if (!connected) {
      throw new Error("Extension not connected and Chrome failed to start");
    }
  }

  return new Promise((resolve, reject) => {
    if (!extensionConnection?.ws) {
      reject(new Error("Extension not connected"));
      return;
    }

    const reqId = `req_${incrementRequestId()}`;
    const timeout = setTimeout(() => {
      pendingExtensionRequests.delete(reqId);
      reject(new Error("Request timed out"));
    }, REQUEST_TIMEOUT_MS);

    pendingExtensionRequests.set(reqId, { resolve, reject, timeout });

    // Include sessionId in params for window isolation
    const paramsWithSession = { ...params };
    if (!paramsWithSession.sessionId) {
      paramsWithSession.sessionId = sessionId || mySessionId;
    }

    sendToExtension({
      type: "route",
      reqId,
      sessionId: sessionId || mySessionId,
      payload: { command, params: paramsWithSession },
    });
  });
}

// Main command routing function
export function sendCommand(
  sessionId: string | null,
  command: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  // If in proxy mode, send through proxy
  if (isProxyMode) {
    return sendProxyCommand(command, {
      ...params,
      sessionId: sessionId || mySessionId,
    });
  }

  // Otherwise, send to extension with sessionId for window isolation
  return sendCommandToExtension(command, params, sessionId);
}
