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

// Debug observer state: observerKey -> { tabId, consoleEntries, networkEntries, requestMap, startedAt }
export const activeObservers = new Map();

// Per-tab command mutex: tabId -> Promise chain for serialized debugger-affecting commands
export const tabMutexes = new Map();

// Run fn exclusively for tabId - queues if another command is already running
export async function withTabMutex(tabId, fn) {
  const prev = tabMutexes.get(tabId) ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const tail = prev.then(() => current, () => current);
  tabMutexes.set(tabId, tail);

  try {
    await prev.catch(() => {});
    return await fn();
  } finally {
    release?.();
    if (tabMutexes.get(tabId) === tail) {
      tabMutexes.delete(tabId);
    }
  }
}

// Persistent debugger session state: tabId -> { attached, refCount, detachTimer, attachPromise }
export const debuggerSessions = new Map();

// Active viewport/device emulation state: tabId -> device config
export const activeEmulations = new Map();

// Pending dialogs: tabId -> { type, message, defaultPrompt }
// Set by global handleDebuggerEvent when Page.javascriptDialogOpening fires.
// Lets waitForDialog detect dialogs that opened before it started listening.
export const pendingDialogs = new Map();

export function cleanupDebuggerSession(tabId) {
  const session = debuggerSessions.get(tabId);
  if (!session) {
    return;
  }

  if (session.detachTimer) {
    clearTimeout(session.detachTimer);
    session.detachTimer = null;
  }

  session.attached = false;
  session.refCount = 0;
  session.attachPromise = null;
  debuggerSessions.delete(tabId);
  activeEmulations.delete(tabId);

  // Clear any pending dialog state for this tab (avoids stale entries after detach/close)
  pendingDialogs.delete(tabId);
}

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
