// Helm MCP Client - Local State

import type { PendingRequest } from "../shared/protocol.js";

// This client's session ID
export let mySessionId: string | null = null;

export function setMySessionId(id: string | null): void {
  mySessionId = id;
}

// Connection to daemon
export let daemonWs: WebSocket | null = null;

export function setDaemonWs(ws: WebSocket | null): void {
  daemonWs = ws;
}

// Is connected and registered
export let isRegistered = false;

export function setRegistered(registered: boolean): void {
  isRegistered = registered;
}

// Pending requests waiting for daemon response
export const pendingRequests = new Map<string, PendingRequest>();

// Request ID counter
let requestIdCounter = 0;

export function generateRequestId(): string {
  return `client_${++requestIdCounter}_${Date.now().toString(36)}`;
}
