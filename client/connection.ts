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
import { buildSessionLabel } from "./label.js";

// Retry settings
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;
const DAEMON_START_WAIT_MS = 2000;

let retryCount = 0;

// Try to start daemon via systemctl (best effort)
async function tryStartDaemon(): Promise<boolean> {
  const { spawn } = await import("child_process");

  console.error("[Client] Attempting to start daemon via systemctl...");

  const start = spawn("systemctl", ["--user", "start", "helm-daemon"]);
  const success = await new Promise<boolean>((resolve) => {
    start.on("close", (code) => resolve(code === 0));
    start.on("error", () => resolve(false));
  });

  if (success) {
    console.error(`[Client] Waiting ${DAEMON_START_WAIT_MS}ms for daemon to start...`);
    await new Promise((resolve) => setTimeout(resolve, DAEMON_START_WAIT_MS));
  }

  return success;
}

// No-op for backward compatibility (daemon check now happens in connectToDaemon)
export async function ensureDaemonRunning(): Promise<void> {
  // Intentionally empty - WebSocket connection will handle daemon availability
}
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

// Generate unique session ID
function generateSessionId(): string {
  return `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Get short directory name for label
function getShortCwd(): string {
  const cwd = process.cwd();
  const parts = cwd.split("/").filter(Boolean);
  return parts[parts.length - 1] || "root";
}

// Connect to daemon (with auto-start fallback)
export async function connectToDaemon(): Promise<void> {
  let connectionFailed = false;
  let wasConnected = false;

  const attemptConnection = (tryDaemonStart: boolean): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      setDaemonWs(ws);

      ws.onopen = () => {
        console.error("[Client] Connected to daemon");
        wasConnected = true;
        retryCount = 0;

        // Generate session ID
        const sessionId = generateSessionId();
        setMySessionId(sessionId);

        // Build label with auto-detection (async)
        const shortCwd = getShortCwd();
        buildSessionLabel(shortCwd, sessionId)
          .catch(() => `MCP Client (${shortCwd}) · ${sessionId.split("-").pop()?.slice(-4) || "unk"}`)
          .then((label) => {
            ws.send(
              JSON.stringify({
                type: "register",
                sessionId,
                label,
              })
            );
          });

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

      ws.onerror = () => {
        connectionFailed = true;
      };

      ws.onclose = async () => {
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

        // Initial connection failed - try starting daemon
        if (connectionFailed && !wasConnected && tryDaemonStart) {
          console.error("[Client] Daemon not reachable, attempting to start...");
          const started = await tryStartDaemon();
          if (started) {
            attemptConnection(false).then(resolve).catch(reject);
          } else {
            reject(new Error("Failed to connect to daemon and could not start it"));
          }
          return;
        }

        // Connection lost after successful connection - retry
        if (wasConnected && retryCount < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount);
          retryCount++;
          console.error(
            `[Client] Connection lost, reconnecting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`
          );
          setTimeout(() => {
            connectToDaemon().catch((err) => {
              console.error("[Client] Reconnect failed:", err);
            });
          }, delay);
        } else if (wasConnected && retryCount >= MAX_RETRIES) {
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
  };

  return attemptConnection(true);
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
