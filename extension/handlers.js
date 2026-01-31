// Helm - Message Handlers

import {
  sessions,
  setSessions,
  setDefaultSessionId,
  tabRouting,
  setTabRouting,
  setProtocolVersion,
} from './state.js';
import { sendMessage } from './websocket.js';
import {
  createSessionWindow,
  closeSessionWindow,
  getSessionWindowInfo,
} from './windows.js';
import { getTabs, switchTab, newTab, closeTab } from './tabs.js';
import {
  navigate,
  screenshot,
  getContent,
  getElementText,
  getUrl,
  click,
  type,
  hover,
  scroll,
  waitForElement,
  clickAt,
  findText,
  pressKey,
  executeScript,
  paste,
} from './commands.js';

// Handle incoming server message
export async function handleServerMessage(message) {
  switch (message.type) {
    case 'welcome':
      handleWelcome(message);
      break;

    case 'sessions':
      handleSessions(message);
      break;

    case 'session_selected':
      handleSessionSelected(message);
      break;

    case 'route':
      await handleRoute(message);
      break;

    case 'error':
      console.error('[Helm] Server error:', message.payload);
      break;

    default:
      // Legacy format support (v1 protocol)
      if (message.id && message.command) {
        await handleLegacyCommand(message);
      }
  }
}

// Handle welcome message
function handleWelcome(message) {
  const payload = message.payload || {};
  setProtocolVersion(payload.protocolVersion || 1);
  setSessions(payload.sessions || []);
  setDefaultSessionId(payload.defaultSessionId);

  console.log(
    `[Helm] Welcome received, protocol v${payload.protocolVersion || 1}, ${(payload.sessions || []).length} sessions`
  );

  chrome.storage.local.set({
    sessions: payload.sessions || [],
    defaultSessionId: payload.defaultSessionId,
    protocolVersion: payload.protocolVersion || 1,
  });
}

// Handle sessions update
function handleSessions(message) {
  const payload = message.payload || {};
  setSessions(payload.sessions || []);
  setDefaultSessionId(payload.defaultSessionId);
  setTabRouting(payload.tabRouting || {});

  console.log(
    `[Helm] Sessions updated: ${(payload.sessions || []).length} sessions`
  );

  chrome.storage.local.set({
    sessions: payload.sessions || [],
    defaultSessionId: payload.defaultSessionId,
    tabRouting: payload.tabRouting || {},
  });
}

// Handle session selected (tab assignment)
function handleSessionSelected(message) {
  const payload = message.payload || {};
  const { tabId, sessionId, success } = payload;

  if (success && tabId !== undefined && sessionId) {
    // Update local tabRouting state
    const newRouting = { ...tabRouting, [tabId]: sessionId };
    setTabRouting(newRouting);

    console.log(`[Helm] Tab ${tabId} assigned to session ${sessionId}`);

    // Persist to storage (triggers popup update via storage.onChanged)
    chrome.storage.local.set({ tabRouting: newRouting });
  } else if (!success) {
    console.error('[Helm] Session selection failed:', payload);
  }
}

// Handle routed command
async function handleRoute(message) {
  const { reqId, sessionId, payload } = message;
  const { command, params } = payload || {};

  try {
    const result = await handleCommand(command, params || {});
    sendMessage({
      type: 'route_result',
      reqId,
      sessionId,
      payload: result,
    });
  } catch (error) {
    sendMessage({
      type: 'error',
      reqId,
      sessionId,
      payload: { code: 'COMMAND_ERROR', message: error.message },
    });
  }
}

// Handle legacy v1 command
async function handleLegacyCommand(message) {
  try {
    const result = await handleCommand(message.command, message.params || {});
    sendMessage({ id: message.id, result });
  } catch (error) {
    sendMessage({ id: message.id, error: error.message });
  }
}

// Main command router
async function handleCommand(command, params) {
  switch (command) {
    // Window isolation commands
    case 'create_window':
      return await createSessionWindow(params.sessionId, params.url);
    case 'close_window':
      return await closeSessionWindow(params.sessionId);
    case 'get_session_window':
      return getSessionWindowInfo(params.sessionId);

    // Navigation
    case 'navigate':
      return await navigate(params.url, params.tabId, params.sessionId);
    case 'screenshot':
      return await screenshot(params.tabId, params.sessionId, params.selector);
    case 'get_content':
      return await getContent(params.tabId, params.sessionId);
    case 'get_element_text':
      return await getElementText(params.selector, params.tabId, params.sessionId, params.index);
    case 'get_url':
      return await getUrl(params.tabId, params.sessionId);

    // Tabs
    case 'get_tabs':
      return await getTabs(params.sessionId);
    case 'switch_tab':
      return await switchTab(params.tabId, params.sessionId);
    case 'new_tab':
      return await newTab(params.url, params.sessionId);
    case 'close_tab':
      return await closeTab(params.tabId, params.sessionId);

    // Interactions
    case 'click':
      return await click(params.selector, params.tabId, params.sessionId);
    case 'type':
      return await type(
        params.selector,
        params.text,
        params.tabId,
        params.sessionId
      );
    case 'hover':
      return await hover(params.selector, params.tabId, params.sessionId);
    case 'scroll':
      return await scroll(
        params.direction,
        params.amount,
        params.selector,
        params.tabId,
        params.sessionId
      );
    case 'wait':
      return await waitForElement(
        params.selector,
        params.timeout,
        params.tabId,
        params.sessionId
      );

    // Coordinates
    case 'click_at':
      return await clickAt(params.x, params.y, params.tabId, params.sessionId, params.verify, params.verifyTimeout);
    case 'find_text':
      return await findText(
        params.text,
        params.click,
        params.filter,
        params.tabId,
        params.sessionId
      );

    // Keyboard
    case 'press_key':
      return await pressKey(params.key, params.selector, params.tabId, params.sessionId);

    // Clipboard
    case 'paste':
      return await paste(params.text, params.selector, params.tabId, params.sessionId);

    // Scripting
    case 'execute':
      return await executeScript(params.code, params.tabId, params.sessionId);

    // Misc
    case 'ping':
      return { status: 'pong' };

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
