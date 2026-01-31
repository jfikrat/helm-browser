// Helm - Background Service Worker
// Multiplex Protocol v2.2 - Window Isolation

import { setWsPort, loadSessionWindows } from './state.js';
import { connect, setupKeepaliveAlarm, sendMessage } from './websocket.js';
import { setupWindowCloseListener } from './windows.js';
import { setupPopupHandler } from './popup-handler.js';

// Setup tab close listener - notify server for routing cleanup
function setupTabCloseListener() {
  chrome.tabs.onRemoved.addListener((tabId) => {
    sendMessage({ type: 'tab_closed', payload: { tabId } });
  });
}

// Setup action click to open side panel
function setupActionClick() {
  chrome.action.onClicked.addListener(async (tab) => {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  });
}

// Initialize extension
async function init() {
  console.log('[Helm] Initializing...');

  // Setup event listeners
  setupWindowCloseListener();
  setupTabCloseListener();
  setupKeepaliveAlarm();
  setupPopupHandler();
  setupActionClick();

  // Load saved port on startup
  const result = await chrome.storage.local.get(['wsPort']);
  if (result.wsPort) {
    setWsPort(result.wsPort);
  }

  // Load persisted sessionWindows
  await loadSessionWindows();

  // Connect to server
  connect();

  console.log('[Helm] Initialized');
}

// Start
init();
