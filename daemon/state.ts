// Helm MCP Daemon - Global State

import type {
  ClientSession,
  ExtensionConnection,
  PendingRequest,
} from "../shared/protocol.js";

// ============================================
// Client Sessions Registry
// ============================================

// All connected MCP clients (sessionId → session info)
export const clientSessions = new Map<string, ClientSession>();

// Window cache: tracks which sessions already have windows created
export const windowCache = new Set<string>();

// ============================================
// Extension Connection
// ============================================

export let extensionConnection: ExtensionConnection | null = null;

export function setExtensionConnection(conn: ExtensionConnection | null): void {
  extensionConnection = conn;
}

// ============================================
// Tab Routing
// ============================================

// Tab → Session mapping (for multi-tab isolation)
export const tabRouting = new Map<number, string>();

// ============================================
// Request Management
// ============================================

// Pending requests waiting for extension response
export const pendingRequests = new Map<string, PendingRequest>();

// Request ID counter
let requestIdCounter = 0;

export function generateRequestId(): string {
  return `req_${++requestIdCounter}_${Date.now().toString(36)}`;
}

// ============================================
// Chrome Process
// ============================================

export let chromeProcess: { pid: number; kill: () => void } | null = null;

export function setChromeProcess(
  proc: { pid: number; kill: () => void } | null
): void {
  chromeProcess = proc;
}

// ============================================
// Session Management Functions
// ============================================

export function registerClient(
  sessionId: string,
  label: string,
  ws: WebSocket
): void {
  const session: ClientSession = {
    sessionId,
    label,
    ws,
    windowId: null,
    registeredAt: Date.now(),
    lastSeen: Date.now(),
  };
  clientSessions.set(sessionId, session);
  console.error(`[Daemon] Client registered: ${sessionId} (${label})`);
}

export function unregisterClient(sessionId: string): void {
  const session = clientSessions.get(sessionId);
  if (session) {
    clientSessions.delete(sessionId);
    windowCache.delete(sessionId);

    // Clean up tab routing for this session
    for (const [tabId, sid] of tabRouting) {
      if (sid === sessionId) {
        tabRouting.delete(tabId);
      }
    }

    console.error(`[Daemon] Client unregistered: ${sessionId}`);
  }
}

export function updateClientLastSeen(sessionId: string): void {
  const session = clientSessions.get(sessionId);
  if (session) {
    session.lastSeen = Date.now();
  }
}

export function setClientWindowId(
  sessionId: string,
  windowId: number | null
): void {
  const session = clientSessions.get(sessionId);
  if (session) {
    session.windowId = windowId;
    if (windowId !== null) {
      windowCache.add(sessionId);
    }
  }
}

export function getSessionList(): Array<{
  sessionId: string;
  label: string;
  windowId: number | null;
  lastSeen: number;
  status: string;
}> {
  return Array.from(clientSessions.values()).map((s) => ({
    sessionId: s.sessionId,
    label: s.label,
    windowId: s.windowId,
    lastSeen: s.lastSeen,
    status: s.windowId ? "ready" : "pending",
  }));
}

// Clear all windowIds (called when extension reconnects after Chrome restart)
export function clearAllWindowIds(): void {
  for (const session of clientSessions.values()) {
    session.windowId = null;
  }
  windowCache.clear();
  tabRouting.clear();
  console.error("[Daemon] Cleared all windowIds (extension reconnected)");
}
