// Helm MCP - Type Definitions

export interface Session {
  id: string;
  label: string;
  status: "ready" | "busy" | "offline";
  lastSeen: number;
  windowId: number | null;
  pendingRequests: Map<string, PendingRequest>;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface ExtensionConnection {
  ws: WebSocket;
  profileId: string;
  capabilities: string[];
  connectedAt: number;
}

export interface ProxySession {
  ws: WebSocket;
  label: string;
}

export interface IncomingMessage {
  type: string;
  reqId?: string;
  sessionId?: string;
  tabId?: number;
  payload?: Record<string, unknown>;
  id?: string;
  command?: string;
  params?: Record<string, unknown>;
}

export interface SessionInfo {
  sessionId: string;
  label: string;
  status: string;
  lastSeen: number;
  windowId?: number | null;
  isProxy?: boolean;
}

export interface LockFileData {
  pid: number;
  port: number;
  startedAt: number;
}
