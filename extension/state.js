// Helm - Global State

// WebSocket state
export let wsPort = 9876;
export let ws = null;
export let reconnectInterval = null;
export let isConnected = false;
export let keepAliveInterval = null;

// Server state (received from server)
export let sessions = [];
export let defaultSessionId = null;
export let tabRouting = {};
export let protocolVersion = 2;

// Window isolation: sessionId -> windowId mapping
export const sessionWindows = new Map();

// Recording state: tabId -> { frames, startTime, maxDuration, timer }
export const activeRecordings = new Map();

// Persist sessionWindows to chrome.storage.local
export async function saveSessionWindows() {
  const data = Object.fromEntries(sessionWindows);
  await chrome.storage.local.set({ sessionWindows: data });
}

// Load sessionWindows from chrome.storage.local
export async function loadSessionWindows() {
  const result = await chrome.storage.local.get(['sessionWindows']);
  if (result.sessionWindows) {
    for (const [sessionId, windowId] of Object.entries(result.sessionWindows)) {
      sessionWindows.set(sessionId, windowId);
    }
    console.log('[Helm] Loaded sessionWindows from storage:', sessionWindows.size, 'entries');
  }
}

// Set window for session (with persistence)
export function setSessionWindow(sessionId, windowId) {
  sessionWindows.set(sessionId, windowId);
  saveSessionWindows();
  console.log(`[Helm] Set window ${windowId} for session ${sessionId}`);
}

// Remove window for session (with persistence)
export function removeSessionWindow(sessionId) {
  sessionWindows.delete(sessionId);
  saveSessionWindows();
}

// Setters
export function setWsPort(port) {
  wsPort = port;
}

export function setWs(socket) {
  ws = socket;
}

export function setReconnectInterval(interval) {
  reconnectInterval = interval;
}

export function setIsConnected(connected) {
  isConnected = connected;
}

export function setKeepAliveInterval(interval) {
  keepAliveInterval = interval;
}

export function setSessions(s) {
  sessions = s;
}

export function setDefaultSessionId(id) {
  defaultSessionId = id;
}

export function setTabRouting(routing) {
  tabRouting = routing;
}

export function setProtocolVersion(version) {
  protocolVersion = version;
}
