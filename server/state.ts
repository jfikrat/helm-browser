// Helm MCP - Global State

import type { Session, ExtensionConnection, ProxySession, PendingRequest } from "./types.js";

// Mode detection
export let isProxyMode = false;
export let proxyWs: WebSocket | null = null;

export function setProxyMode(mode: boolean) {
  isProxyMode = mode;
}

export function setProxyWs(ws: WebSocket | null) {
  proxyWs = ws;
}

// Server state
export const sessions = new Map<string, Session>();
export let extensionConnection: ExtensionConnection | null = null;
export const tabRouting = new Map<number, string>();
export let defaultSessionId: string | null = null;
export let requestIdCounter = 0;

// This instance's own session ID (used by both main server and proxy)
export let mySessionId: string | null = null;

export function setMySessionId(id: string | null) {
  mySessionId = id;
}

export function setExtensionConnection(conn: ExtensionConnection | null) {
  extensionConnection = conn;
}

export function setDefaultSessionId(id: string | null) {
  defaultSessionId = id;
}

export function incrementRequestId(): number {
  return ++requestIdCounter;
}

// Proxy sessions (registered by other Claude instances)
export const proxySessions = new Map<string, ProxySession>();

// Pending requests for proxy mode
export const proxyPendingRequests = new Map<string, PendingRequest>();

// Pending extension requests
export const pendingExtensionRequests = new Map<string, PendingRequest>();

// Proxy window cache - tracks which sessions already have windows created (Fix 5)
export const proxyWindowCache = new Set<string>();

// Chrome process
export let chromeProcess: { pid: number; kill: () => void } | null = null;

export function setChromeProcess(proc: { pid: number; kill: () => void } | null) {
  chromeProcess = proc;
}
