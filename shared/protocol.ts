// Helm MCP - Shared Protocol Types
// Client ↔ Daemon communication protocol

// ============================================
// Client → Daemon Messages
// ============================================

export interface RegisterMessage {
  type: "register";
  sessionId: string;
  label: string;
}

export interface UnregisterMessage {
  type: "unregister";
  sessionId: string;
}

export interface CommandMessage {
  type: "command";
  reqId: string;
  sessionId: string;
  command: string;
  params: Record<string, unknown>;
}

export interface KeepaliveMessage {
  type: "keepalive";
  sessionId: string;
}

export type ClientMessage =
  | RegisterMessage
  | UnregisterMessage
  | CommandMessage
  | KeepaliveMessage;

// ============================================
// Daemon → Client Messages
// ============================================

export interface RegisteredMessage {
  type: "registered";
  sessionId: string;
  success: boolean;
  error?: string;
}

export interface ResponseMessage {
  type: "response";
  reqId: string;
  sessionId: string;
  payload: unknown;
}

export interface ErrorMessage {
  type: "error";
  reqId?: string;
  sessionId?: string;
  code: string;
  message: string;
}

export interface StatusMessage {
  type: "status";
  extensionConnected: boolean;
  chromeRunning: boolean;
  sessionCount: number;
}

export type DaemonMessage =
  | RegisteredMessage
  | ResponseMessage
  | ErrorMessage
  | StatusMessage;

// ============================================
// Extension Messages (internal to daemon)
// ============================================

export interface ExtensionHelloMessage {
  type: "hello";
  payload?: {
    profileId?: string;
    capabilities?: string[];
  };
}

export interface ExtensionRouteResultMessage {
  type: "route_result";
  reqId: string;
  sessionId?: string;
  payload?: unknown;
}

export interface ExtensionErrorMessage {
  type: "error";
  reqId?: string;
  sessionId?: string;
  payload?: {
    code?: string;
    message?: string;
  };
}

export interface ExtensionTabClosedMessage {
  type: "tab_closed";
  tabId?: number;
  payload?: {
    tabId?: number;
  };
}

export type ExtensionMessage =
  | ExtensionHelloMessage
  | ExtensionRouteResultMessage
  | ExtensionErrorMessage
  | ExtensionTabClosedMessage
  | { type: string; [key: string]: unknown };

// ============================================
// Session Types
// ============================================

export interface ClientSession {
  sessionId: string;
  label: string;
  ws: WebSocket;
  windowId: number | null;
  registeredAt: number;
  lastSeen: number;
}

export interface ExtensionConnection {
  ws: WebSocket;
  profileId: string;
  capabilities: string[];
  connectedAt: number;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  sessionId: string;
}

export interface SessionInfo {
  sessionId: string;
  label: string;
  windowId: number | null;
  lastSeen: number;
}
