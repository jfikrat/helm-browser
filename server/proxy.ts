// Helm MCP - Proxy Mode

import {
  WS_PORT,
  PROXY_MAX_RETRIES,
  PROXY_INITIAL_DELAY_MS,
  PROXY_KEEPALIVE_INTERVAL_MS,
} from "./config.js";
import type { IncomingMessage } from "./types.js";
import {
  proxyPendingRequests,
  setProxyMode,
  setProxyWs,
  setMySessionId,
  mySessionId,
} from "./state.js";

// Retry state
let proxyRetryCount = 0;
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

// Reference to current WebSocket for graceful shutdown
let currentProxyWs: WebSocket | null = null;

// Get short directory name for label
function getShortCwd(): string {
  const cwd = process.cwd();
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'root';
}

// Start in proxy mode (connect to existing main server)
export async function startProxyMode(): Promise<void> {
  setProxyMode(true);
  console.error(`[MCP] Port ${WS_PORT} in use, starting in PROXY MODE`);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    setProxyWs(ws);
    currentProxyWs = ws;

    ws.onopen = () => {
      console.error("[MCP] Connected to main server as proxy");
      proxyRetryCount = 0; // Reset on successful connect

      // Register this session with main server
      const sessionId = `proxy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      setMySessionId(sessionId);

      const shortCwd = getShortCwd();
      ws.send(
        JSON.stringify({
          type: "register_proxy_session",
          payload: {
            sessionId,
            label: process.env.CLAUDE_SESSION_LABEL || `Proxy (${shortCwd})`,
          },
        })
      );

      // Start keepalive
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
      }
      keepaliveInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "keepalive" }));
        }
      }, PROXY_KEEPALIVE_INTERVAL_MS);

      resolve();
    };

    ws.onerror = (error) => {
      console.error("[MCP] Proxy connection error:", error);
      reject(error);
    };

    ws.onclose = () => {
      console.error("[MCP] Proxy connection closed");
      setProxyWs(null);
      currentProxyWs = null;

      // Clear keepalive
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
      }

      // Check retry limit
      if (proxyRetryCount >= PROXY_MAX_RETRIES) {
        console.error("[MCP] Max reconnect attempts reached, giving up");
        process.exit(1);
      }

      // Exponential backoff
      const delay = PROXY_INITIAL_DELAY_MS * Math.pow(2, proxyRetryCount);
      proxyRetryCount++;
      console.error(`[MCP] Attempting reconnect in ${delay}ms (attempt ${proxyRetryCount}/${PROXY_MAX_RETRIES})`);

      setTimeout(() => {
        startProxyMode().catch((err) => {
          console.error("[MCP] Reconnect failed:", err);
        });
      }, delay);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        handleProxyMessage(message);
      } catch (error) {
        console.error("[MCP] Error parsing proxy message:", error);
      }
    };
  });
}

// Send unregister message before shutdown (graceful shutdown)
export function sendProxyUnregister(): void {
  if (currentProxyWs && currentProxyWs.readyState === WebSocket.OPEN) {
    currentProxyWs.send(
      JSON.stringify({
        type: "unregister_proxy_session",
        payload: { sessionId: mySessionId },
      })
    );
  }
}

// Handle messages received from main server
function handleProxyMessage(message: IncomingMessage): void {
  if (message.type === "proxy_response" && message.reqId) {
    const pending = proxyPendingRequests.get(message.reqId);
    if (pending) {
      clearTimeout(pending.timeout);
      proxyPendingRequests.delete(message.reqId);
      pending.resolve(message.payload);
    }
  } else if (message.type === "proxy_error" && message.reqId) {
    const pending = proxyPendingRequests.get(message.reqId);
    if (pending) {
      clearTimeout(pending.timeout);
      proxyPendingRequests.delete(message.reqId);
      pending.reject(
        new Error((message.payload as any)?.message || "Proxy error")
      );
    }
  }
}
