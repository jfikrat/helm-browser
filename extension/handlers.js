// Helm - Message Handlers

import {
  sessions,
  setSessions,
  setDefaultSessionId,
  tabRouting,
  setTabRouting,
  setProtocolVersion,
  activeEmulations,
  cleanupDebuggerSession,
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
  back,
  forward,
  reload,
  screenshot,
  getContent,
  getInteractables,
  getSemanticSnapshot,
  getConsoleLogs,
  getNetworkRequests,
  getElementText,
  query,
  getUrl,
  listTargets,
  click,
  type,
  uploadFile,
  hover,
  scroll,
  waitForElement,
  waitForUrl,
  waitForText,
  clickAt,
  findText,
  pressKey,
  dragAndDrop,
  waitForDownload,
  downloadUrl,
  waitForRequest,
  waitForNetworkIdle,
  executeScript,
  waitForFunction,
  paste,
  recordStart,
  waitForPopup,
  waitForDialog,
  handleDialog,
  emulateDevice,
  rightClick,
  doubleClick,
  pressKeys,
  selectOption,
  resetViewport,
  handleDebuggerEvent,
  getDebugStatus,
  getSnapshot,
  clickAndWait,
  typeAndWait,
  submitAndWait,
  sequence,
} from './commands.js';

// Set up debugger event listener for screencast frames
chrome.debugger.onEvent.addListener((source, method, params) => {
  handleDebuggerEvent(source, method, params);
});

// Track debugger detach reasons
chrome.debugger.onDetach.addListener((source, reason) => {
  console.warn(`[Helm] Debugger detached from tab ${source.tabId}, reason: ${reason}`);
  if (source?.tabId !== undefined) {
    activeEmulations.delete(source.tabId);
    cleanupDebuggerSession(source.tabId);
  }
});

// Clean up persistent debugger state when a tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  activeEmulations.delete(tabId);
  cleanupDebuggerSession(tabId);
});

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

    case 'ping':
      // Respond to keep connection alive (wakes up Service Worker)
      sendMessage({ type: 'pong' });
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

function buildCookieRemovalUrl(cookie, fallbackUrl) {
  try {
    const parsedFallback = fallbackUrl ? new URL(fallbackUrl) : null;
    const protocol = cookie.secure ? 'https:' : (parsedFallback?.protocol || 'http:');
    const host = String(cookie.domain || parsedFallback?.hostname || '')
      .replace(/^\./, '');
    const path = cookie.path || '/';
    return `${protocol}//${host}${path}`;
  } catch {
    return fallbackUrl;
  }
}

function normalizeSameSite(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'lax') return 'lax';
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none' || normalized === 'no_restriction') return 'no_restriction';
  if (normalized === 'unspecified') return 'unspecified';
  return value;
}

async function setCookie(params) {
  const { url, name, value, domain, path, secure, httpOnly, expirationDate, sameSite } = params;
  if (!url || !name) {
    throw new Error('url and name are required to set a cookie');
  }

  const cookie = await chrome.cookies.set({
    url,
    name,
    value: String(value ?? ''),
    ...(domain !== undefined ? { domain } : {}),
    ...(path !== undefined ? { path } : {}),
    ...(secure !== undefined ? { secure: Boolean(secure) } : {}),
    ...(httpOnly !== undefined ? { httpOnly: Boolean(httpOnly) } : {}),
    ...(expirationDate !== undefined ? { expirationDate: Number(expirationDate) } : {}),
    ...(sameSite !== undefined ? { sameSite: normalizeSameSite(sameSite) } : {}),
  });

  return { success: true, cookie };
}

async function clearCookies(params) {
  const { url, name } = params;
  if (!url) {
    throw new Error('url is required to clear cookies');
  }

  if (name) {
    const result = await chrome.cookies.remove({ url, name });
    return {
      success: true,
      removedCount: result ? 1 : 0,
      removed: result ? [{ url, name }] : [],
    };
  }

  const cookies = await chrome.cookies.getAll({ url });
  let removedCount = 0;
  const removed = [];

  for (const cookie of cookies) {
    const removalUrl = buildCookieRemovalUrl(cookie, url);
    const result = await chrome.cookies.remove({
      url: removalUrl,
      name: cookie.name,
    });

    if (result) {
      removedCount += 1;
      removed.push({
        url: removalUrl,
        name: cookie.name,
      });
    }
  }

  return { success: true, removedCount, removed };
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
    case 'back':
      return await back(params.tabId, params.sessionId, params.timeout);
    case 'forward':
      return await forward(params.tabId, params.sessionId, params.timeout);
    case 'reload':
      return await reload(params.tabId, params.sessionId);
    case 'screenshot':
      return await screenshot(params.tabId, params.sessionId, params.selector, params.fullPage);
    case 'get_content':
      return await getContent(params.tabId, params.sessionId);
    case 'get_interactables':
      return await getInteractables(params.tabId, params.sessionId, params.limit);
    case 'get_semantic_snapshot':
      return await getSemanticSnapshot(params.tabId, params.sessionId, params.limit);
    case 'get_console_logs':
      return await getConsoleLogs(params.tabId, params.sessionId, params.duration, params.reload);
    case 'get_network_requests':
      return await getNetworkRequests(params.tabId, params.sessionId, params.duration, params.reload);
    case 'get_element_text':
      return await getElementText(
        params.selector,
        params.tabId,
        params.sessionId,
        params.index,
        params.locator,
        params.visibleOnly
      );
    case 'query':
      return await query(
        params.selector,
        params.locator,
        params.scope,
        params.match,
        params.contains,
        params.exact,
        params.headingLevel,
        params.includeHidden,
        params.limit,
        params.tabId,
        params.sessionId
      );
    case 'get_url':
      return await getUrl(params.tabId, params.sessionId);
    case 'get_snapshot':
      return await getSnapshot(
        params.tabId,
        params.sessionId,
        params.incremental,
        params.sinceVersion
      );
    case 'list_targets':
      return await listTargets(params.sessionId);

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
      return await click(
        params.selector,
        params.tabId,
        params.sessionId,
        params.verify,
        params.verifyTimeout,
        params.locator
      );
    case 'click_and_wait':
      return await clickAndWait(
        params.selector,
        params.waitFor,
        params.timeout,
        params.tabId,
        params.sessionId,
        params.locator
      );
    case 'right_click':
      return await rightClick(params.selector, params.tabId, params.sessionId, params.locator);
    case 'double_click':
      return await doubleClick(params.selector, params.tabId, params.sessionId, params.locator);
    case 'type':
      return await type(
        params.selector,
        params.text,
        params.tabId,
        params.sessionId,
        params.verify,
        params.verifyTimeout,
        params.locator
      );
    case 'type_and_wait':
      return await typeAndWait(
        params.selector,
        params.text,
        params.waitFor,
        params.timeout,
        params.tabId,
        params.sessionId,
        params.locator,
        params.verify,
        params.verifyTimeout
      );
    case 'upload_file':
      return await uploadFile(
        params.selector,
        params.paths ?? params.path,
        params.tabId,
        params.sessionId,
        params.verify,
        params.verifyTimeout
      );
    case 'hover':
      return await hover(params.selector, params.tabId, params.sessionId, params.locator);
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
        params.sessionId,
        params.locator
      );
    case 'wait_for_url':
      return await waitForUrl(
        params.url,
        params.match,
        params.timeout,
        params.tabId,
        params.sessionId
      );
    case 'wait_for_text':
      return await waitForText(
        params.text,
        params.timeout,
        params.tabId,
        params.sessionId
      );
    case 'wait_for_popup':
      return await waitForPopup(params.timeout, params.tabId, params.sessionId);
    case 'wait_for_dialog':
      return await waitForDialog(params.timeout, params.tabId, params.sessionId);
    case 'handle_dialog':
      return await handleDialog(params.accept, params.promptText, params.tabId, params.sessionId);
    case 'submit_and_wait':
      return await submitAndWait(
        params.selector,
        params.waitFor,
        params.timeout,
        params.tabId,
        params.sessionId,
        params.locator
      );
    case 'sequence':
      return await sequence(
        params.steps,
        params.tabId,
        params.sessionId,
        params.stopOnError,
        params.defaultTimeout
      );
    case 'emulate_device':
      return await emulateDevice(params.device, params.tabId, params.sessionId);
    case 'reset_viewport':
      return await resetViewport(params.tabId, params.sessionId);

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
      return await pressKey(
        params.key,
        params.selector,
        params.tabId,
        params.sessionId,
        params.verify,
        params.verifyTimeout,
        params.locator
      );
    case 'press_keys':
      return await pressKeys(params.keys, params.selector, params.tabId, params.sessionId);
    case 'select':
      return await selectOption(params.selector, params.value, params.tabId, params.sessionId, params.locator);
    case 'drag_and_drop':
      return await dragAndDrop(params.sourceSelector, params.targetSelector, params.tabId, params.sessionId);
    case 'wait_for_download':
      return await waitForDownload(params.timeout, params.filenameContains);
    case 'download_url':
      return await downloadUrl(
        params.url,
        params.filename,
        params.saveAs,
        params.wait,
        params.timeout
      );
    case 'wait_for_request':
      return await waitForRequest(
        params.url,
        params.match,
        params.method,
        params.status,
        params.timeout,
        params.reload,
        params.tabId,
        params.sessionId
      );
    case 'wait_for_network_idle':
      return await waitForNetworkIdle(
        params.idleTime,
        params.timeout,
        params.reload,
        params.tabId,
        params.sessionId
      );

    // Clipboard
    case 'paste':
      return await paste(params.text, params.selector, params.tabId, params.sessionId);

    // Scripting
    case 'execute':
      return await executeScript(params.code, params.tabId, params.sessionId);
    case 'wait_for_function':
      return await waitForFunction(params.expression, params.timeout, params.interval, params.tabId, params.sessionId);

    // Recording
    case 'record_start':
      return await recordStart(params.tabId, params.sessionId, params.maxDuration, params.execute);

    // Cookies
    case 'get_cookies':
      return await getCookies(params.url, params.name);
    case 'set_cookie':
      return await setCookie(params);
    case 'clear_cookies':
      return await clearCookies(params);

    // Misc
    case 'debug_status':
      return await getDebugStatus();
    case 'ping':
      return { status: 'pong' };

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Get cookies via chrome.cookies API (includes HttpOnly)
async function getCookies(url, name) {
  const params = {};
  if (url) params.url = url;
  if (name) params.name = name;

  const cookies = await chrome.cookies.getAll(params);
  return {
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      httpOnly: c.httpOnly,
      secure: c.secure,
      expirationDate: c.expirationDate,
    })),
    cookieString: cookies.map((c) => c.name + '=' + c.value).join('; '),
  };
}
