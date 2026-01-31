// Helm MCP Client - Daemon Connection

import {
  WS_PORT,
  CLIENT_KEEPALIVE_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
} from "../shared/config.js";
import type { DaemonMessage } from "../shared/protocol.js";
import {
  mySessionId,
  setMySessionId,
  daemonWs,
  setDaemonWs,
  setRegistered,
  pendingRequests,
  generateRequestId,
} from "./state.js";

// Retry settings
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

let retryCount = 0;
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

// Generate session ID from working directory
function generateSessionId(): string {
  return `claude-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Get short directory name for label
function getShortCwd(): string {
  const cwd = process.cwd();
  const parts = cwd.split("/").filter(Boolean);
  return parts[parts.length - 1] || "root";
}

// Connect to daemon
export async function connectToDaemon(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    setDaemonWs(ws);

    ws.onopen = () => {
      console.error("[Client] Connected to daemon");
      retryCount = 0;

      // Generate and register session
      const sessionId = generateSessionId();
      setMySessionId(sessionId);

      const label = process.env.HELM_SESSION_LABEL || `MCP Client (${getShortCwd()})`;

      ws.send(
        JSON.stringify({
          type: "register",
          sessionId,
          label,
        })
      );

      // Start keepalive
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
      }
      keepaliveInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN && mySessionId) {
          ws.send(
            JSON.stringify({
              type: "keepalive",
              sessionId: mySessionId,
            })
          );
        }
      }, CLIENT_KEEPALIVE_INTERVAL_MS);
    };

    ws.onerror = (error) => {
      console.error("[Client] Connection error:", error);
    };

    ws.onclose = () => {
      console.error("[Client] Connection closed");
      setDaemonWs(null);
      setRegistered(false);

      // Clear keepalive
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
      }

      // Reject all pending requests
      for (const [reqId, pending] of pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Connection to daemon lost"));
      }
      pendingRequests.clear();

      // Retry connection
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
        retryCount++;
        console.error(
          `[Client] Reconnecting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`
        );
        setTimeout(() => {
          connectToDaemon().catch((err) => {
            console.error("[Client] Reconnect failed:", err);
          });
        }, delay);
      } else {
        console.error("[Client] Max reconnect attempts reached");
        process.exit(1);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString()) as DaemonMessage;
        handleDaemonMessage(message, resolve, reject);
      } catch (error) {
        console.error("[Client] Error parsing message:", error);
      }
    };
  });
}

// Handle messages from daemon
function handleDaemonMessage(
  message: DaemonMessage,
  resolveConnect: (value: void) => void,
  rejectConnect: (error: Error) => void
): void {
  switch (message.type) {
    case "registered":
      if (message.success) {
        setRegistered(true);
        console.error(`[Client] Registered with session: ${message.sessionId}`);
        resolveConnect();
      } else {
        rejectConnect(new Error(message.error || "Registration failed"));
      }
      break;

    case "response":
      handleResponse(message);
      break;

    case "error":
      handleError(message);
      break;

    case "status":
      // Status updates can be logged if needed
      break;

    default:
      console.error(`[Client] Unknown message type: ${(message as any).type}`);
  }
}

function handleResponse(message: { reqId: string; payload: unknown }): void {
  const pending = pendingRequests.get(message.reqId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingRequests.delete(message.reqId);
    pending.resolve(message.payload);
  }
}

function handleError(message: { reqId?: string; code: string; message: string }): void {
  if (message.reqId) {
    const pending = pendingRequests.get(message.reqId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingRequests.delete(message.reqId);
      pending.reject(new Error(`${message.code}: ${message.message}`));
    }
  } else {
    console.error(`[Client] Daemon error: ${message.code}: ${message.message}`);
  }
}

// Send command to daemon
export function sendCommand(
  command: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!daemonWs || daemonWs.readyState !== WebSocket.OPEN) {
      reject(new Error("Not connected to daemon"));
      return;
    }

    if (!mySessionId) {
      reject(new Error("Session not registered"));
      return;
    }

    const reqId = generateRequestId();
    const timeout = setTimeout(() => {
      pendingRequests.delete(reqId);
      reject(new Error("Request timed out"));
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(reqId, { resolve, reject, timeout, sessionId: mySessionId });

    daemonWs.send(
      JSON.stringify({
        type: "command",
        reqId,
        sessionId: mySessionId,
        command,
        params,
      })
    );
  });
}

// Disconnect from daemon (graceful shutdown)
export function disconnectFromDaemon(): void {
  if (daemonWs && daemonWs.readyState === WebSocket.OPEN && mySessionId) {
    daemonWs.send(
      JSON.stringify({
        type: "unregister",
        sessionId: mySessionId,
      })
    );
  }

  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }

  if (daemonWs) {
    daemonWs.close();
    setDaemonWs(null);
  }

  setRegistered(false);
}
