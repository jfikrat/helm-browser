// Helm - Popup Message Handler

import {
  wsPort,
  setWsPort,
  isConnected,
  sessions,
  defaultSessionId,
  tabRouting,
  protocolVersion,
  sessionWindows,
} from './state.js';
import { connect, reconnect, sendMessage } from './websocket.js';

// Setup popup communication
export function setupPopupHandler() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'getStatus':
        // Merge daemon sessions with extension's real windowIds
        const sessionsWithRealWindows = sessions.map(s => ({
          ...s,
          windowId: sessionWindows.get(s.sessionId) || s.windowId,
        }));
        sendResponse({
          connected: isConnected,
          port: wsPort,
          sessions: sessionsWithRealWindows,
          defaultSessionId,
          tabRouting,
          protocolVersion,
        });
        break;

      case 'reconnect':
        reconnect();
        sendResponse({ status: 'reconnecting' });
        break;

      case 'setPort':
        setWsPort(message.port);
        chrome.storage.local.set({ wsPort: message.port });
        reconnect();
        sendResponse({ status: 'port_changed', port: message.port });
        break;

      case 'selectSession':
        sendMessage({
          type: 'select_session',
          payload: {
            tabId: message.tabId,
            sessionId: message.sessionId,
          },
        });
        sendResponse({ status: 'selecting' });
        break;

      case 'listSessions':
        sendMessage({ type: 'list_sessions' });
        sendResponse({ status: 'requesting' });
        break;

      case 'focusWindow':
        if (message.windowId) {
          chrome.windows.update(message.windowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
              sendResponse({ status: 'error', error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ status: 'focused' });
            }
          });
          return true;
        }
        sendResponse({ status: 'error', error: 'No windowId provided' });
        break;

      case 'focusSession':
        // Get real windowId from extension's sessionWindows Map
        const realWindowId = sessionWindows.get(message.sessionId);
        console.log('[Helm] focusSession:', message.sessionId, 'windowId:', realWindowId, 'map size:', sessionWindows.size);

        if (!realWindowId) {
          // Try to find any window with tabs for this session (fallback)
          sendResponse({ success: false, error: 'No window in map' });
          break;
        }
        chrome.windows.update(realWindowId, { focused: true }, () => {
          if (chrome.runtime.lastError) {
            console.error('[Helm] Focus failed:', chrome.runtime.lastError.message);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true });
          }
        });
        return true;
    }
    return true;
  });
}
