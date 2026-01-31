// Helm MCP - Session Management

import type { Session, SessionInfo } from "./types.js";
import {
  sessions,
  proxySessions,
  tabRouting,
  defaultSessionId,
  setDefaultSessionId,
  mySessionId,
  extensionConnection,
} from "./state.js";
import { sendToExtension, sendCommandToExtension } from "./commands.js";

// Generate unique session ID
export function generateSessionId(): string {
  return `claude-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Broadcast sessions to extension
export function broadcastSessions(): void {
  if (extensionConnection?.ws) {
    sendToExtension({
      type: "sessions",
      payload: {
        sessions: getSessionList(),
        defaultSessionId,
        tabRouting: Object.fromEntries(tabRouting),
      },
    });
  }
}

// Get list of all sessions (local + proxy)
export function getSessionList(): SessionInfo[] {
  const localSessions = Array.from(sessions.values()).map((s) => ({
    sessionId: s.id,
    label: s.label,
    status: s.status,
    lastSeen: s.lastSeen,
    windowId: s.windowId,
  }));

  // Include proxy sessions
  const proxySessionList = Array.from(proxySessions.entries()).map(
    ([id, info]) => ({
      sessionId: id,
      label: info.label,
      status: "ready" as const,
      lastSeen: Date.now(),
      isProxy: true,
    })
  );

  return [...localSessions, ...proxySessionList];
}

// Get short directory name for label
function getShortCwd(): string {
  const cwd = process.cwd();
  const parts = cwd.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'root';
}

// Register new session (lazy - no window created until needed)
export async function registerSession(label?: string): Promise<string> {
  const id = generateSessionId();
  const shortCwd = getShortCwd();
  const session: Session = {
    id,
    label: label || `MCP Client (${shortCwd})`,
    status: "ready",
    lastSeen: Date.now(),
    windowId: null,
    pendingRequests: new Map(),
  };
  sessions.set(id, session);
  setDefaultSessionId(id);

  // Window is created lazily on first tool use (see ensureSessionWindow)
  broadcastSessions();
  console.error(`[MCP] Session registered: ${id} (${session.label}) - window will be created on first use`);
  return id;
}

// Ensure session has a window (lazy initialization)
export async function ensureSessionWindow(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;

  // Already has a window
  if (session.windowId) return true;

  // Try to create window
  if (extensionConnection) {
    try {
      const result = (await sendCommandToExtension("create_window", {
        sessionId,
      })) as { windowId?: number };
      if (result?.windowId) {
        session.windowId = result.windowId;
        console.error(`[MCP] Lazy window created: ${result.windowId} for session ${sessionId}`);
        broadcastSessions();
        return true;
      }
    } catch (error) {
      console.error(`[MCP] Failed to create lazy window for session ${sessionId}:`, error);
    }
  }
  return false;
}

// Unregister session
export async function unregisterSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    // Close isolated window
    if (session.windowId && extensionConnection) {
      try {
        await sendCommandToExtension("close_window", { sessionId });
        console.error(`[MCP] Closed window for session ${sessionId}`);
      } catch (error) {
        console.error(
          `[MCP] Failed to close window for session ${sessionId}:`,
          error
        );
      }
    }

    for (const [, req] of session.pendingRequests) {
      clearTimeout(req.timeout);
      req.reject(new Error("Session disconnected"));
    }
    session.pendingRequests.clear();
    sessions.delete(sessionId);

    for (const [tabId, sid] of tabRouting) {
      if (sid === sessionId) tabRouting.delete(tabId);
    }

    if (defaultSessionId === sessionId) {
      setDefaultSessionId(
        sessions.size > 0 ? Array.from(sessions.keys())[0] : null
      );
    }

    broadcastSessions();
    console.error(`[MCP] Session unregistered: ${sessionId}`);
  }
}

// Resolve session from tabId or defaults
export function resolveSession(tabId?: number): string | null {
  if (tabId !== undefined && tabRouting.has(tabId)) {
    const sessionId = tabRouting.get(tabId)!;
    if (sessions.has(sessionId) || proxySessions.has(sessionId)) {
      return sessionId;
    }
    tabRouting.delete(tabId);
  }

  if (mySessionId && sessions.has(mySessionId)) {
    return mySessionId;
  }

  if (defaultSessionId && sessions.has(defaultSessionId)) {
    return defaultSessionId;
  }

  if (sessions.size > 0) {
    return Array.from(sessions.keys())[0];
  }

  return null;
}
