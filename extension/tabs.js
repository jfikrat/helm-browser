// Helm - Tab Management

import { getWindowIdForSession } from './windows.js';

// Get target tab with window isolation
export async function getTargetTab(tabId, sessionId) {
  const windowId = getWindowIdForSession(sessionId);

  // Warn if no session isolation (helps debug cross-session issues)
  if (!sessionId) {
    console.warn('[Helm] getTargetTab called without sessionId - isolation bypassed');
  } else if (!windowId) {
    console.warn(`[Helm] Session ${sessionId} has no window - command will fail`);
  }

  if (tabId !== undefined) {
    const tab = await chrome.tabs.get(tabId);
    // Verify tab belongs to session's window if isolation is active
    if (windowId && tab.windowId !== windowId) {
      throw new Error(`Tab ${tabId} does not belong to this session's window`);
    }
    // sessionId varken windowId yoksa → hard error (auto-register cross-session leak'e yol açar)
    if (sessionId && !windowId) {
      throw new Error(`ERR_NO_WINDOW: Session ${sessionId} has no window. Use browser_navigate first.`);
    }
    return tab;
  }

  // If session has an isolated window, get active tab from that window
  if (windowId) {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) return tab;
    // Fallback: get any tab from the window
    const tabs = await chrome.tabs.query({ windowId });
    if (tabs.length > 0) return tabs[0];
    throw new Error('No tabs in session window');
  }

  // sessionId varken windowId yoksa → hard error (window kapanmış veya hiç açılmamış)
  if (sessionId) {
    throw new Error(`ERR_NO_WINDOW: Session ${sessionId} has no window. Use browser_navigate first.`);
  }

  // Fallback: active tab in current window (sessionId yoksa legacy kullanım)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Get all tabs (filtered by session window)
export async function getTabs(sessionId) {
  const windowId = getWindowIdForSession(sessionId);

  if (!sessionId) {
    console.warn('[Helm] getTabs called without sessionId - returning all tabs');
  } else if (!windowId) {
    throw new Error(`ERR_NO_WINDOW: Session ${sessionId} has no window. Use browser_navigate first.`);
  }

  const query = windowId ? { windowId } : {};
  const tabs = await chrome.tabs.query(query);

  return tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    active: tab.active,
    windowId: tab.windowId,
  }));
}

// Switch to tab
export async function switchTab(tabId, sessionId) {
  const windowId = getWindowIdForSession(sessionId);
  const tab = await chrome.tabs.get(tabId);

  // Verify tab belongs to session's window
  if (windowId && tab.windowId !== windowId) {
    throw new Error(`Tab ${tabId} does not belong to this session's window`);
  }

  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  return { success: true, tabId, title: tab.title, url: tab.url };
}

// Create new tab
export async function newTab(url, sessionId) {
  const windowId = getWindowIdForSession(sessionId);

  if (!sessionId) {
    console.warn('[Helm] newTab called without sessionId - using default window');
  } else if (!windowId) {
    throw new Error(`ERR_NO_WINDOW: Session ${sessionId} has no window. Use browser_navigate first.`);
  }

  const createOptions = { url: url || 'about:blank' };
  if (windowId) {
    createOptions.windowId = windowId;
  }

  const tab = await chrome.tabs.create(createOptions);

  if (url) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve({
          success: true,
          tabId: tab.id,
          url,
          windowId: tab.windowId,
          note: 'Tab opened (load timeout)',
        });
      }, 10000);

      function listener(updatedTabId, info) {
        if (updatedTabId === tab.id && info.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve({ success: true, tabId: tab.id, url, windowId: tab.windowId });
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
  return { success: true, tabId: tab.id, windowId: tab.windowId };
}

// Close tab
export async function closeTab(tabId, sessionId) {
  const windowId = getWindowIdForSession(sessionId);

  if (!sessionId) {
    console.warn('[Helm] closeTab called without sessionId - isolation bypassed');
  } else if (!windowId) {
    throw new Error(`ERR_NO_WINDOW: Session ${sessionId} has no window. Use browser_navigate first.`);
  }

  if (tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (windowId && tab.windowId !== windowId) {
      throw new Error(`Tab ${tabId} does not belong to this session's window`);
    }
    await chrome.tabs.remove(tabId);
    return { success: true, tabId };
  }

  // Close active tab in session's window (windowId kesinlikle var, yukarıda guard'landı)
  const query = windowId ? { active: true, windowId } : { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(query);
  if (!tab) throw new Error('No active tab to close');

  await chrome.tabs.remove(tab.id);
  return { success: true, tabId: tab.id };
}
