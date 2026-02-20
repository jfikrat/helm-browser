// Helm - Window Isolation

import { sessionWindows, setSessionWindow, removeSessionWindow } from './state.js';
import { sendMessage } from './websocket.js';

// Physical window size for optimal AI vision coordinate prediction
// Window: 1310x890 → Viewport: ~1310x800
// Zoom: 0.8 to fit more content (zoomout)
export const WINDOW_WIDTH = 1310;
export const WINDOW_HEIGHT = 890;  // viewport + chrome UI (~90px)
export const BROWSER_ZOOM = 1.0;

// Setup window close listener
export function setupWindowCloseListener() {
  chrome.windows.onRemoved.addListener((windowId) => {
    for (const [sessionId, wId] of sessionWindows.entries()) {
      if (wId === windowId) {
        removeSessionWindow(sessionId);
        console.log(
          `[Helm] Window ${windowId} closed, removed mapping for session ${sessionId}`
        );
        sendMessage({
          type: 'window_closed',
          payload: { sessionId, windowId },
        });
      }
    }
  });
}

// Create isolated window for session (no fixed size - zoom handles viewport)
export async function createSessionWindow(sessionId, url = 'about:blank') {
  // Check if session already has a window
  if (sessionWindows.has(sessionId)) {
    const existingWindowId = sessionWindows.get(sessionId);
    try {
      await chrome.windows.get(existingWindowId);
      return {
        success: true,
        windowId: existingWindowId,
        sessionId,
        note: 'Window already exists',
      };
    } catch (e) {
      // Window was closed, remove from map
      removeSessionWindow(sessionId);
    }
  }

  // Create new window for this session with fixed size
  const window = await chrome.windows.create({
    url: url,
    focused: true,
    type: 'normal',
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  });

  setSessionWindow(sessionId, window.id);
  console.log(
    `[Helm] Created window ${window.id} for session ${sessionId}`
  );

  return {
    success: true,
    windowId: window.id,
    sessionId,
    tabId: window.tabs?.[0]?.id,
  };
}

// Close session's window
export async function closeSessionWindow(sessionId) {
  const windowId = sessionWindows.get(sessionId);
  if (!windowId) {
    return { success: false, error: 'No window for this session' };
  }

  try {
    await chrome.windows.remove(windowId);
    removeSessionWindow(sessionId);
    console.log(
      `[Helm] Closed window ${windowId} for session ${sessionId}`
    );
    return { success: true, windowId, sessionId };
  } catch (e) {
    removeSessionWindow(sessionId);
    return { success: true, note: 'Window was already closed' };
  }
}

// Get session window info
export function getSessionWindowInfo(sessionId) {
  const windowId = sessionWindows.get(sessionId);
  if (!windowId) {
    return { hasWindow: false, sessionId };
  }
  return { hasWindow: true, windowId, sessionId };
}

// Get windowId for a session (for filtering tabs)
export function getWindowIdForSession(sessionId) {
  if (!sessionId) return null;
  return sessionWindows.get(sessionId) || null;
}
