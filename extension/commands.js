// Helm - DOM Commands

import { getTargetTab } from './tabs.js';
import { getWindowIdForSession, WINDOW_WIDTH, WINDOW_HEIGHT, BROWSER_ZOOM } from './windows.js';
import {
  activeObservers,
  activeEmulations,
  activeRecordings,
  cleanupDebuggerSession,
  debuggerSessions,
  pendingDialogs,
  withTabMutex,
} from './state.js';

// Restricted URL patterns - cannot execute scripts on these pages
const RESTRICTED_PATTERNS = [
  /^chrome:/i,
  /^chrome-extension:/i,
  /^about:/i,
  /^edge:/i,
  /^brave:/i,
  /^data:/i,
  /^view-source:/i,
];
const ERROR_INDICATORS = ['ERR_', 'chrome-error://'];
const DEBUGGER_GRACE_PERIOD_MS = 5000;

function isRestrictedUrl(url) {
  if (!url) return true;
  if (RESTRICTED_PATTERNS.some(p => p.test(url))) return true;
  if (ERROR_INDICATORS.some(e => url.includes(e))) return true;
  return false;
}

const DEVICE_PRESETS = {
  "iPhone 15": {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  "iPhone 15 Pro Max": {
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  "iPhone 14": {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
  "Pixel 8": {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  },
  "Pixel 8 Pro": {
    width: 412,
    height: 892,
    deviceScaleFactor: 3.5,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  },
  "iPad Pro": {
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  "Galaxy S24": {
    width: 360,
    height: 780,
    deviceScaleFactor: 3,
    mobile: true,
    touch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  },
};

function getAvailableDevicePresets() {
  return Object.keys(DEVICE_PRESETS);
}

function resolveDeviceConfig(device) {
  if (typeof device === 'string') {
    const presetName = Object.keys(DEVICE_PRESETS).find(
      (name) => name.toLowerCase() === device.trim().toLowerCase()
    );

    if (!presetName) {
      return {
        ok: false,
        error: `Unknown device preset: ${device}. Available presets: ${getAvailableDevicePresets().join(', ')}`,
      };
    }

    return { ok: true, config: { ...DEVICE_PRESETS[presetName], presetName } };
  }

  if (!device || typeof device !== 'object') {
    return { ok: false, error: 'device must be a preset name or a custom config object' };
  }

  const { width, height, deviceScaleFactor, mobile, userAgent, touch } = device;
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof deviceScaleFactor !== 'number' ||
    typeof mobile !== 'boolean'
  ) {
    return {
      ok: false,
      error:
        'Custom device config must include numeric width, height, deviceScaleFactor, and boolean mobile',
    };
  }

  return {
    ok: true,
    config: {
      width,
      height,
      deviceScaleFactor,
      mobile,
      ...(typeof userAgent === 'string' && userAgent ? { userAgent } : {}),
      touch: typeof touch === 'boolean' ? touch : mobile,
    },
  };
}

export async function emulateDevice(device, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  const resolved = resolveDeviceConfig(device);

  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }

  const config = resolved.config;
  const alreadyHolding = activeEmulations.has(tab.id);
  const dbg = await acquireDebugger(tab.id);

  try {
    await dbg.send('Emulation.setDeviceMetricsOverride', {
      width: config.width,
      height: config.height,
      deviceScaleFactor: config.deviceScaleFactor,
      mobile: config.mobile,
      screenWidth: config.width,
      screenHeight: config.height,
    });

    if (typeof config.userAgent === 'string') {
      await dbg.send('Emulation.setUserAgentOverride', {
        userAgent: config.userAgent,
      });
    }

    await dbg.send('Emulation.setTouchEmulationEnabled', {
      enabled: !!config.touch,
      maxTouchPoints: config.touch ? 5 : 0,
    });

    activeEmulations.set(tab.id, config);

    // If already holding a ref from a previous emulateDevice call, release
    // the extra ref acquired this time — the existing held ref keeps it alive.
    // Otherwise, intentionally keep this ref to prevent the 5s grace-period
    // detach from clearing the emulation. resetViewport will release it.
    if (alreadyHolding) {
      releaseDebugger(tab.id);
    }

    return { success: true, device: config };
  } catch (error) {
    releaseDebugger(tab.id);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

export async function resetViewport(tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  const wasHolding = activeEmulations.has(tab.id);
  const dbg = await acquireDebugger(tab.id);

  try {
    await dbg.send('Emulation.clearDeviceMetricsOverride');
    await dbg.send('Emulation.setUserAgentOverride', { userAgent: '' });
    await dbg.send('Emulation.setTouchEmulationEnabled', {
      enabled: false,
      maxTouchPoints: 1,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  } finally {
    activeEmulations.delete(tab.id);
    releaseDebugger(tab.id); // release this call's ref
    if (wasHolding) {
      releaseDebugger(tab.id); // release the permanently-held ref from emulateDevice
    }
  }
}

// Safe executeScript wrapper - catches error page exceptions and edge cases
async function safeExecuteScript(tabId, func, args = [], frameId = null, world = 'ISOLATED') {
  try {
    const target = frameId ? { tabId, frameIds: [frameId] } : { tabId };
    const results = await chrome.scripting.executeScript({
      target,
      func,
      args,
      world,
    });

    // Handle empty/missing results
    if (!results || !results[0]) {
      return { ok: false, error: 'Script execution returned no result', restricted: false };
    }

    return { ok: true, result: results[0].result };
  } catch (e) {
    const msg = (e.message || '').toLowerCase();

    // Error page detection (multiple patterns for robustness)
    if (msg.includes('error page') || msg.includes('showing error') ||
        msg.includes('cannot access') || msg.includes('frame with id')) {
      return { ok: false, error: 'Page is showing an error or is inaccessible', restricted: true };
    }

    // Permission/access errors
    if (msg.includes('permission') || msg.includes('not allowed') ||
        msg.includes('denied') || msg.includes('prohibited')) {
      return { ok: false, error: 'Access denied or insufficient permissions', restricted: true };
    }

    // Invalid tab/frame errors
    if (msg.includes('no tab') || msg.includes('tab was closed') ||
        msg.includes('invalid tab') || msg.includes('no frame')) {
      return { ok: false, error: 'Tab or frame is no longer available', restricted: false };
    }

    // Re-throw truly unknown errors
    throw e;
  }
}

async function resolveLocator(tabId, locator) {
  const { ok, result, error, restricted } = await safeExecuteScript(
    tabId,
    (loc) => {
      function findByRole(role, name) {
        const roleValue = String(role || '').trim();
        if (!roleValue) return null;

        const tagSelector = /^[a-z][a-z0-9-]*$/i.test(roleValue) ? roleValue : null;
        const roleSelector = `[role="${CSS.escape(roleValue)}"]`;
        const all = tagSelector
          ? document.querySelectorAll(`${roleSelector}, ${tagSelector}`)
          : document.querySelectorAll(roleSelector);

        for (const el of all) {
          const label =
            el.getAttribute('aria-label') ||
            el.textContent?.trim() ||
            el.getAttribute('title') ||
            '';
          if (!name || label.toLowerCase().includes(String(name).toLowerCase())) return el;
        }
        return null;
      }

      function findByText(text) {
        const needle = String(text || '').trim().toLowerCase();
        if (!needle) return null;
        const root = document.body || document.documentElement;
        if (!root) return null;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const content = node.textContent?.trim() || '';
          if (content.toLowerCase().includes(needle)) {
            const el = node.parentElement;
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) return el;
          }
        }
        return null;
      }

      function findByLabel(label) {
        const needle = String(label || '').trim().toLowerCase();
        if (!needle) return null;

        for (const lbl of document.querySelectorAll('label')) {
          const labelText = lbl.textContent?.trim() || '';
          if (labelText.toLowerCase().includes(needle)) {
            if (lbl.htmlFor) return document.getElementById(lbl.htmlFor);
            return lbl.querySelector('input,select,textarea') || lbl;
          }
        }

        const aria = Array.from(document.querySelectorAll('[aria-label]')).find((el) =>
          (el.getAttribute('aria-label') || '').toLowerCase().includes(needle)
        );
        return aria || null;
      }

      function findByPlaceholder(ph) {
        const needle = String(ph || '').trim().toLowerCase();
        if (!needle) return null;
        return Array.from(document.querySelectorAll('[placeholder]')).find((el) =>
          (el.getAttribute('placeholder') || '').toLowerCase().includes(needle)
        ) || null;
      }

      function findByTestId(id) {
        const value = String(id || '').trim();
        if (!value) return null;
        return document.querySelector(
          `[data-testid="${CSS.escape(value)}"], [data-test="${CSS.escape(value)}"], [data-cy="${CSS.escape(value)}"]`
        );
      }

      function findByRef(ref) {
        const value = String(ref || '').trim();
        if (!value) return null;
        return document.querySelector(`[data-helm-ref="${CSS.escape(value)}"]`);
      }

      function getSelector(el) {
        if (!el) return null;
        if (el.id) return `#${CSS.escape(el.id)}`;

        const ref = el.getAttribute('data-helm-ref');
        if (ref) return `[data-helm-ref="${CSS.escape(ref)}"]`;

        const parts = [];
        let cur = el;
        while (cur && cur !== document.body) {
          const tag = cur.tagName.toLowerCase();
          const siblings = cur.parentElement
            ? Array.from(cur.parentElement.children).filter((child) => child.tagName === cur.tagName)
            : [];
          const index = siblings.length > 1 ? siblings.indexOf(cur) + 1 : 1;
          parts.unshift(`${tag}:nth-of-type(${index})`);
          cur = cur.parentElement;
        }
        return `body > ${parts.join(' > ')}`;
      }

      let el = null;
      if (loc?.ref) el = findByRef(loc.ref);
      else if (loc?.role) el = findByRole(loc.role, loc.name);
      else if (loc?.label) el = findByLabel(loc.label);
      else if (loc?.placeholder) el = findByPlaceholder(loc.placeholder);
      else if (loc?.text) el = findByText(loc.text);
      else if (loc?.testId) el = findByTestId(loc.testId);

      if (!el) return null;

      const rect = el.getBoundingClientRect();
      return {
        selector: getSelector(el),
        x: Math.round(rect.x + rect.width / 2),
        y: Math.round(rect.y + rect.height / 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    },
    [locator]
  );

  if (!ok) return { ok: false, error, restricted };
  if (!result?.selector) {
    return { ok: false, error: `Element not found for locator: ${JSON.stringify(locator)}`, restricted };
  }

  return { ok: true, ...result };
}

function getDebuggerSession(tabId) {
  let session = debuggerSessions.get(tabId);
  if (!session) {
    session = {
      attached: false,
      refCount: 0,
      detachTimer: null,
      attachPromise: null,
    };
    debuggerSessions.set(tabId, session);
  }

  return session;
}

async function ensureDebuggerAttached(tabId, session) {
  if (session.attached) {
    return;
  }

  if (!session.attachPromise) {
    const attachPromise = (async () => {
      await chrome.debugger.attach({ tabId }, '1.3');

      if (debuggerSessions.get(tabId) !== session) {
        try {
          await chrome.debugger.detach({ tabId });
        } catch {
          // The tab may already be gone or detached by another actor.
        }
        throw new Error(`Debugger session for tab ${tabId} was cleaned up during attach`);
      }

      session.attached = true;

      // Re-apply device emulation if it was active before detach
      const emulation = activeEmulations.get(tabId);
      if (emulation) {
        try {
          await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
            width: emulation.width,
            height: emulation.height,
            deviceScaleFactor: emulation.deviceScaleFactor,
            mobile: emulation.mobile,
            screenWidth: emulation.width,
            screenHeight: emulation.height,
          });
          if (typeof emulation.userAgent === 'string') {
            await chrome.debugger.sendCommand({ tabId }, 'Emulation.setUserAgentOverride', {
              userAgent: emulation.userAgent,
            });
          }
          await chrome.debugger.sendCommand({ tabId }, 'Emulation.setTouchEmulationEnabled', {
            enabled: !!emulation.touch,
            maxTouchPoints: emulation.touch ? 5 : 0,
          });
        } catch {
          // Non-fatal: emulation re-apply failed (tab may be navigating)
        }
      }
    })();

    session.attachPromise = attachPromise;
    attachPromise.then(() => {
      if (debuggerSessions.get(tabId) === session && session.attachPromise === attachPromise) {
        session.attachPromise = null;
      }
    }, () => {
      if (debuggerSessions.get(tabId) === session && session.attachPromise === attachPromise) {
        session.attachPromise = null;
      }
    });
  }

  await session.attachPromise;
}

export async function acquireDebugger(tabId) {
  const session = getDebuggerSession(tabId);

  if (session.detachTimer) {
    clearTimeout(session.detachTimer);
    session.detachTimer = null;
  }

  session.refCount += 1;

  try {
    await ensureDebuggerAttached(tabId, session);
  } catch (error) {
    session.refCount = Math.max(0, session.refCount - 1);
    if (session.refCount === 0 && debuggerSessions.get(tabId) === session) {
      cleanupDebuggerSession(tabId);
    }
    throw error;
  }

  return {
    send: (method, params = {}) =>
      chrome.debugger.sendCommand({ tabId }, method, params),
  };
}

export function releaseDebugger(tabId) {
  const session = debuggerSessions.get(tabId);
  if (!session) {
    return;
  }

  session.refCount = Math.max(0, session.refCount - 1);

  if (session.refCount > 0) {
    return;
  }

  if (session.detachTimer) {
    return;
  }

  if (!session.attached && !session.attachPromise) {
    cleanupDebuggerSession(tabId);
    return;
  }

  session.detachTimer = setTimeout(() => {
    void (async () => {
      const currentSession = debuggerSessions.get(tabId);
      if (currentSession !== session) {
        return;
      }

      session.detachTimer = null;

      if (session.refCount > 0) {
        return;
      }

      try {
        if (session.attachPromise) {
          await session.attachPromise;
        }

        if (debuggerSessions.get(tabId) !== session || session.refCount > 0) {
          return;
        }

        if (session.attached) {
          if (session.refCount > 0) {
            return;
          }

          try {
            await chrome.debugger.detach({ tabId });
          } catch {
            // Ignore detach races with external debugger owners or closed tabs.
          }
        }
      } finally {
        if (debuggerSessions.get(tabId) === session && session.refCount === 0) {
          cleanupDebuggerSession(tabId);
        }
      }
    })().catch((error) => {
      console.warn(`[Helm] Delayed debugger detach failed for tab ${tabId}: ${error.message}`);
    });
  }, DEBUGGER_GRACE_PERIOD_MS);
}

async function captureScreenshotWithDebugger(tabId) {
  const dbg = await acquireDebugger(tabId);
  try {
    await dbg.send('Page.enable');

    const result = await dbg.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 90,
      captureBeyondViewport: false,
    });

    if (!result?.data) {
      throw new Error('Debugger screenshot returned no data');
    }

    return `data:image/jpeg;base64,${result.data}`;
  } finally {
    releaseDebugger(tabId);
  }
}

async function dispatchNativeClick(tabId, x, y) {
  await dispatchMouseSequence(tabId, x, y, { button: 'left', clickCount: 1, repeatCount: 1 });
}

async function dispatchMouseSequence(tabId, x, y, { button, clickCount, repeatCount }) {
  const dbg = await acquireDebugger(tabId);
  try {
    await dbg.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'none',
    });

    const buttons = button === 'right' ? 2 : 1;
    for (let i = 0; i < repeatCount; i += 1) {
      await dbg.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button,
        buttons,
        clickCount,
      });
      await dbg.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button,
        buttons: 0,
        clickCount,
      });
    }
  } finally {
    releaseDebugger(tabId);
  }
}

async function dispatchNativeKey(tabId, keyName) {
  const keyMap = {
    Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
    Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
    Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
    Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
    ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  };

  const keyInfo = keyMap[keyName] || {
    key: keyName,
    code: keyName.length === 1 ? `Key${keyName.toUpperCase()}` : keyName,
    keyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 0,
    text: keyName.length === 1 ? keyName : undefined,
  };

  const dbg = await acquireDebugger(tabId);
  try {
    await dbg.send('Input.dispatchKeyEvent', {
      type: keyInfo.text ? 'keyDown' : 'rawKeyDown',
      key: keyInfo.key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.keyCode,
      nativeVirtualKeyCode: keyInfo.keyCode,
      text: keyInfo.text,
      unmodifiedText: keyInfo.text,
    });

    if (keyInfo.text) {
      await dbg.send('Input.dispatchKeyEvent', {
        type: 'char',
        key: keyInfo.key,
        code: keyInfo.code,
        text: keyInfo.text,
        unmodifiedText: keyInfo.text,
        windowsVirtualKeyCode: keyInfo.keyCode,
        nativeVirtualKeyCode: keyInfo.keyCode,
      });
    }

    await dbg.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: keyInfo.key,
      code: keyInfo.code,
      windowsVirtualKeyCode: keyInfo.keyCode,
      nativeVirtualKeyCode: keyInfo.keyCode,
    });
  } finally {
    releaseDebugger(tabId);
  }
}

async function insertNativeText(tabId, text) {
  const dbg = await acquireDebugger(tabId);
  try {
    await dbg.send('Input.insertText', { text });
  } finally {
    releaseDebugger(tabId);
  }
}

function getFileNameFromPath(filePath) {
  return String(filePath).split('/').filter(Boolean).pop() || String(filePath);
}

function normalizeUploadPaths(value) {
  const paths = Array.isArray(value) ? value : [value];
  return paths
    .map((entry) => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean);
}

async function waitForCondition(check, timeout = 1000, interval = 100) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const result = await check();
    if (result?.done) {
      return result.value;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return null;
}

async function waitForTabUrl(tabId, predicate, timeout = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const tab = await chrome.tabs.get(tabId);
    if (predicate(tab.url || '')) {
      return { success: true, url: tab.url, title: tab.title, tabId };
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  const tab = await chrome.tabs.get(tabId);
  return {
    success: false,
    error: 'Timeout',
    url: tab.url,
    title: tab.title,
    tabId,
  };
}

function serializeRemoteObject(arg) {
  if (arg?.value !== undefined) return arg.value;
  if (arg?.unserializableValue !== undefined) return arg.unserializableValue;
  if (arg?.description) return arg.description;
  return null;
}

function matchesText(value, expected, match = 'includes') {
  const actual = String(value || '');
  if (match === 'equals') return actual === expected;
  if (match === 'regex') {
    try {
      return new RegExp(expected).test(actual);
    } catch {
      return false;
    }
  }
  return actual.includes(expected);
}

function matchesNetworkEntry(entry, { url, match = 'includes', method = null, status = null }) {
  if (!entry) return false;
  if (!matchesText(entry.url || entry.finalUrl || '', url, match)) return false;
  if (method && String(entry.method || '').toUpperCase() !== String(method).toUpperCase()) return false;
  if (status !== null && status !== undefined && Number(entry.status) !== Number(status)) return false;
  return true;
}

async function watchNetwork(tabId, {
  reload = false,
  timeout = 15000,
  predicate,
}) {
  return await withTabMutex(tabId, async () => {
    const key = Symbol('watchNetwork');
    const observer = {
      tabId,
      consoleEntries: [],
      networkEntries: [],
      requestMap: new Map(),
      activeRequests: new Set(),
      startedAt: Date.now(),
      lastNetworkActivityAt: Date.now(),
    };

    activeObservers.set(key, observer);

    try {
      const dbg = await acquireDebugger(tabId);
      try {
        await dbg.send('Network.enable');

        if (reload) {
          await dbg.send('Page.enable');
          await dbg.send('Page.reload', { ignoreCache: false });
        }

        const startedAt = Date.now();
        while (Date.now() - startedAt < Math.min(Math.max(timeout, 1000), 120000)) {
          const decision = predicate(observer);
          if (decision?.done) {
            return decision.value;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return {
          success: false,
          error: 'Timeout',
          observedRequests: Array.from(observer.requestMap.values()).slice(-20),
        };
      } finally {
        releaseDebugger(tabId);
      }
    } finally {
      activeObservers.delete(key);
    }
  });
}

async function collectDebugEvents(tabId, {
  duration = 1000,
  reload = false,
  captureConsole = false,
  captureNetwork = false,
}) {
  return await withTabMutex(tabId, async () => {
    const clampedDuration = Math.min(Math.max(duration, 100), 10000);
    const key = Symbol('collectDebugEvents');
    const observer = {
      tabId,
      consoleEntries: [],
      networkEntries: [],
      requestMap: new Map(),
      startedAt: Date.now(),
    };

    activeObservers.set(key, observer);

    try {
      const dbg = await acquireDebugger(tabId);
      try {
        if (captureConsole) {
          await dbg.send('Runtime.enable');
          await dbg.send('Log.enable');
        }

        if (captureNetwork) {
          await dbg.send('Network.enable');
        }

        if (reload) {
          await dbg.send('Page.enable');
          await dbg.send('Page.reload', { ignoreCache: false });
        }

        await new Promise((r) => setTimeout(r, clampedDuration));

        return {
          success: true,
          duration: clampedDuration,
          consoleEntries: observer.consoleEntries,
          networkEntries: Array.from(observer.requestMap.values()).concat(observer.networkEntries),
        };
      } finally {
        releaseDebugger(tabId);
      }
    } finally {
      activeObservers.delete(key);
    }
  });
}

// Navigate to URL
export async function navigate(url, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  // Resize window to fixed size and set zoom for more content
  if (tab.windowId) {
    try {
      await chrome.windows.update(tab.windowId, {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
      });
      await chrome.tabs.setZoom(tab.id, BROWSER_ZOOM);
      console.log(`[Helm] Window: ${WINDOW_WIDTH}x${WINDOW_HEIGHT}, Zoom: ${BROWSER_ZOOM}`);
    } catch (e) {
      console.warn(`[Helm] Failed to setup window: ${e.message}`);
    }
  }

  await chrome.tabs.update(tab.id, { url });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve({ success: true, url, note: 'Navigation started (load timeout)' });
    }, 15000);

    function listener(updatedTabId, info) {
      if (updatedTabId === tab.id && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve({ success: true, url });
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Take screenshot (full page or element)
export async function screenshot(tabId, sessionId, selector = null, fullPage = false) {
  const windowId = getWindowIdForSession(sessionId);
  if (sessionId && !windowId) {
    throw new Error(`ERR_NO_WINDOW: Session ${sessionId} has no window assigned. Use browser_navigate first.`);
  }
  const captureWindowId = windowId || null;
  const tab = await getTargetTab(tabId, sessionId);

  return await withTabMutex(tab.id, async () => {
    // Get element bounds if selector provided
    let elementBounds = null;
    if (selector) {
      // Check for restricted URL when selector is used
      if (isRestrictedUrl(tab.url)) {
        return { error: 'Cannot query elements on restricted page', restricted: true, url: tab.url };
      }

      const { ok, result, error, restricted } = await safeExecuteScript(
        tab.id,
        (sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        },
        [selector]
      );

      if (!ok) return { error, restricted };
      elementBounds = result;
      if (!elementBounds) {
        return { error: `Element not found: ${selector}` };
      }
    }

    let jpegUrl;

    if (fullPage && !elementBounds) {
      const dbg = await acquireDebugger(tab.id);
      try {
        await dbg.send('Page.enable');

        const layoutMetrics = await dbg.send('Page.getLayoutMetrics');
        const { contentSize } = layoutMetrics || {};
        const width = Math.ceil(contentSize?.width || 0);
        const height = Math.min(Math.ceil(contentSize?.height || 0), 16384);

        if (!width || !height) {
          throw new Error('Full-page screenshot metrics were unavailable');
        }

        await dbg.send('Emulation.setDeviceMetricsOverride', {
          mobile: false,
          width,
          height,
          deviceScaleFactor: 1,
        });

        try {
          const result = await dbg.send('Page.captureScreenshot', {
            format: 'jpeg',
            quality: 85,
            captureBeyondViewport: true,
          });

          if (!result?.data) {
            throw new Error('Full-page screenshot returned no data');
          }

          jpegUrl = `data:image/jpeg;base64,${result.data}`;
        } finally {
          await dbg.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
        }
      } catch (captureError) {
        return {
          error: `Screenshot failed: ${captureError?.message || captureError}`,
        };
      } finally {
        releaseDebugger(tab.id);
      }
    } else {
      let shouldUseDebugger = false;

      if (captureWindowId) {
        try {
          const window = await chrome.windows.get(captureWindowId);
          shouldUseDebugger = !window.focused;
        } catch {
          shouldUseDebugger = false;
        }
      }

      try {
        jpegUrl = shouldUseDebugger
          ? await captureScreenshotWithDebugger(tab.id)
          : await chrome.tabs.captureVisibleTab(captureWindowId, {
              format: 'jpeg',
              quality: 90,
            });
      } catch (captureError) {
        try {
          jpegUrl = await captureScreenshotWithDebugger(tab.id);
        } catch (debuggerError) {
          return {
            error: `Screenshot failed: ${captureError?.message || captureError}. Debugger fallback failed: ${debuggerError?.message || debuggerError}`,
          };
        }
      }
    }

    // Convert to WebP and optionally crop
    try {
      const response = await fetch(jpegUrl);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);

      // Calculate device pixel ratio for accurate cropping
      const dpr = bitmap.width / (await getViewportWidth(tab.id));

      let canvas;
      let ctx;

      if (elementBounds) {
        // Crop to element bounds
        const cropX = Math.round(elementBounds.x * dpr);
        const cropY = Math.round(elementBounds.y * dpr);
        const cropWidth = Math.round(elementBounds.width * dpr);
        const cropHeight = Math.round(elementBounds.height * dpr);

        canvas = new OffscreenCanvas(cropWidth, cropHeight);
        ctx = canvas.getContext('2d');
        ctx.drawImage(
          bitmap,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );
      } else {
        canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
      }

      const webpBlob = await canvas.convertToBlob({
        type: 'image/webp',
        quality: 0.8,
      });
      const arrayBuffer = await webpBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      return {
        image: `data:image/webp;base64,${base64}`,
        ...(elementBounds && { bounds: elementBounds })
      };
    } catch (e) {
      return { image: jpegUrl, error: e.message };
    }
  });
}

// Helper to get viewport width for DPR calculation
async function getViewportWidth(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.innerWidth,
    });
    return results[0]?.result || 1920;
  } catch {
    return 1920;
  }
}

// Get page content
export async function getContent(tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot get content from restricted page', restricted: true, url: tab.url };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    () => ({
      title: document.title,
      url: window.location.href,
      html: document.documentElement.outerHTML.substring(0, 50000),
      text: document.body.innerText.substring(0, 20000),
    })
  );

  if (!ok) return { error, restricted };
  return result;
}

export async function getInteractables(tabId, sessionId, limit = 100) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot inspect interactable elements on restricted page', restricted: true, url: tab.url };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (maxItems) => {
      const selectors = [
        'a[href]',
        'button',
        'input:not([type="hidden"])',
        'textarea',
        'select',
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ];

      const unique = new Set();
      const elements = [];

      const buildSelector = (element) => {
        if (element.id) return `#${CSS.escape(element.id)}`;
        const testId = element.getAttribute('data-testid');
        if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
        const name = element.getAttribute('name');
        if (name) return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
        const aria = element.getAttribute('aria-label');
        if (aria) return `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(aria)}"]`;

        const path = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 4) {
          let part = current.tagName.toLowerCase();
          const siblings = current.parentElement
            ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName)
            : [];
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            part += `:nth-of-type(${index})`;
          }
          path.unshift(part);
          current = current.parentElement;
        }
        return path.join(' > ');
      };

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((element) => {
          if (unique.has(element)) return;
          unique.add(element);
          elements.push(element);
        });
      }

      const visible = elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const text = (
            element.innerText ||
            element.getAttribute('aria-label') ||
            element.getAttribute('placeholder') ||
            element.getAttribute('value') ||
            ''
          ).trim();

          if (rect.width < 4 || rect.height < 4) return null;
          if (style.visibility === 'hidden' || style.display === 'none') return null;
          if (rect.bottom < 0 || rect.right < 0) return null;

          return {
            selector: buildSelector(element),
            tagName: element.tagName,
            type: element.getAttribute('type') || null,
            role: element.getAttribute('role') || null,
            text: text.substring(0, 120),
            disabled: !!element.disabled || element.getAttribute('aria-disabled') === 'true',
            href: element.href || null,
            bounds: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          };
        })
        .filter(Boolean)
        .slice(0, maxItems);

      return {
        count: visible.length,
        interactables: visible,
      };
    },
    [Math.min(Math.max(limit, 1), 200)]
  );

  if (!ok) return { error, restricted };
  return result;
}

export async function getSemanticSnapshot(tabId, sessionId, limit = 20) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot inspect semantic page structure on restricted page', restricted: true, url: tab.url };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (maxItems) => {
      const clamp = (items) => items.filter(Boolean).slice(0, maxItems);
      const textOf = (element) => (
        element?.innerText ||
        element?.textContent ||
        element?.getAttribute?.('aria-label') ||
        element?.getAttribute?.('placeholder') ||
        ''
      ).replace(/\s+/g, ' ').trim().slice(0, 160);

      const selectorOf = (element) => {
        if (!element) return null;
        if (element.id) return `#${CSS.escape(element.id)}`;
        const name = element.getAttribute('name');
        if (name) return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
        const role = element.getAttribute('role');
        if (role) return `${element.tagName.toLowerCase()}[role="${CSS.escape(role)}"]`;
        return element.tagName.toLowerCase();
      };

      const landmarks = clamp(
        Array.from(document.querySelectorAll('main, nav, header, footer, aside, section, [role]')).map((element) => {
          const role = element.getAttribute('role') || element.tagName.toLowerCase();
          if (!['main', 'nav', 'header', 'footer', 'aside', 'section', 'form', 'search', 'dialog', 'banner', 'contentinfo', 'region', 'complementary'].includes(role)) {
            return null;
          }
          return {
            role,
            label: element.getAttribute('aria-label') || textOf(element),
            selector: selectorOf(element),
          };
        })
      );

      const headings = clamp(
        Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')).map((element) => ({
          level: Number(element.getAttribute('aria-level') || element.tagName.replace('H', '') || 0) || null,
          text: textOf(element),
          selector: selectorOf(element),
        }))
      );

      const forms = clamp(
        Array.from(document.querySelectorAll('form')).map((form) => {
          const controls = Array.from(form.querySelectorAll('input, textarea, select, button')).slice(0, maxItems).map((control) => ({
            tagName: control.tagName,
            type: control.getAttribute('type') || null,
            name: control.getAttribute('name') || null,
            label: control.getAttribute('aria-label') || control.getAttribute('placeholder') || textOf(control.labels?.[0]) || textOf(control),
            selector: selectorOf(control),
          }));

          return {
            selector: selectorOf(form),
            action: form.getAttribute('action') || null,
            method: (form.getAttribute('method') || 'get').toUpperCase(),
            controls,
          };
        })
      );

      const primaryActions = clamp(
        Array.from(document.querySelectorAll('a[href], button, input[type="submit"], [role="button"]')).map((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) return null;
          return {
            tagName: element.tagName,
            text: textOf(element),
            href: element.href || null,
            selector: selectorOf(element),
          };
        })
      );

      return {
        title: document.title,
        url: window.location.href,
        landmarks,
        headings,
        forms,
        primaryActions,
        counts: {
          links: document.links.length,
          buttons: document.querySelectorAll('button, input[type="submit"], [role="button"]').length,
          forms: document.forms.length,
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]').length,
        },
      };
    },
    [Math.min(Math.max(limit, 1), 50)]
  );

  if (!ok) return { error, restricted };
  return result;
}

export async function getConsoleLogs(tabId, sessionId, duration = 1000, reload = false) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot collect console logs on restricted page', restricted: true, url: tab.url };
  }

  const result = await collectDebugEvents(tab.id, {
    duration,
    reload,
    captureConsole: true,
  });

  return {
    success: true,
    duration: result.duration,
    entries: result.consoleEntries,
    tabId: tab.id,
  };
}

export async function getNetworkRequests(tabId, sessionId, duration = 1000, reload = false) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot collect network requests on restricted page', restricted: true, url: tab.url };
  }

  const debugResult = await collectDebugEvents(tab.id, {
    duration,
    reload,
    captureNetwork: true,
  });

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    () => ({
      navigation: performance.getEntriesByType('navigation').slice(0, 1).map((entry) => ({
        name: entry.name,
        type: entry.type,
        duration: Math.round(entry.duration),
        domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
        loadEventEnd: Math.round(entry.loadEventEnd),
      })),
      resources: performance.getEntriesByType('resource').slice(-100).map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
      })),
    })
  );

  if (!ok) return { success: false, error, restricted };

  return {
    success: true,
    duration: debugResult.duration,
    requests: debugResult.networkEntries,
    performance: result,
    tabId: tab.id,
  };
}

// Get element text content (bypasses CSP, no eval)
// index: null = first match, -1 = last match, 0+ = specific index
export async function getElementText(selector, tabId, sessionId, index = null, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot query elements on restricted page', restricted: true, url: tab.url };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel, idx) => {
      const elements = document.querySelectorAll(sel);
      if (elements.length === 0) {
        return { error: `Element not found: ${sel}` };
      }

      let element;
      if (idx === null || idx === undefined) {
        element = elements[0]; // First match (default)
      } else if (idx === -1) {
        element = elements[elements.length - 1]; // Last match
      } else {
        element = elements[idx]; // Specific index
        if (!element) {
          return { error: `Index ${idx} out of range (found ${elements.length} elements)` };
        }
      }

      return {
        selector: sel,
        index: idx === -1 ? elements.length - 1 : (idx ?? 0),
        totalMatches: elements.length,
        text: element.innerText,
        tagName: element.tagName,
        className: element.className,
      };
    },
    [selector, index]
  );

  if (!ok) return { error, restricted };
  return result;
}

// Get current URL
export async function getUrl(tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  return { url: tab.url, title: tab.title, tabId: tab.id };
}

export async function listTargets(sessionId) {
  const windowId = getWindowIdForSession(sessionId);
  const queryOpts = windowId ? { windowId } : {};
  const tabs = await chrome.tabs.query(queryOpts);

  const targets = [];
  for (const tab of tabs) {
    const target = {
      type: 'tab',
      tabId: tab.id,
      windowId: tab.windowId,
      url: tab.url,
      title: tab.title,
      active: tab.active,
      openerTabId: tab.openerTabId ?? null,
      frames: [],
    };

    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      target.frames = (frames || [])
        .map((frame) => ({
          frameId: frame.frameId,
          parentFrameId: frame.parentFrameId,
          url: frame.url,
          errorOccurred: frame.errorOccurred,
        }))
        .filter((frame) => frame.frameId !== 0);
    } catch {
      // Tab may not support frame listing
    }

    targets.push(target);
  }

  return { targets, count: targets.length };
}

export async function getSnapshot(tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot get snapshot from restricted page', restricted: true };
  }

  const { ok, result, error } = await safeExecuteScript(
    tab.id,
    () => {
      let counter = parseInt(document.body?.getAttribute('data-helm-ref-counter') || '0', 10);
      const INTERACTIVE = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [tabindex]';
      const elements = document.querySelectorAll(INTERACTIVE);
      const refs = [];

      for (const el of elements) {
        if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;
        if (!el.getAttribute('data-helm-ref')) {
          el.setAttribute('data-helm-ref', `e${++counter}`);
          if (document.body) {
            document.body.setAttribute('data-helm-ref-counter', String(counter));
          }
        }

        const ref = el.getAttribute('data-helm-ref');
        const rect = el.getBoundingClientRect();
        refs.push({
          ref,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          name: el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim()?.slice(0, 80) || '',
          placeholder: el.getAttribute('placeholder') || '',
          type: el.getAttribute('type') || '',
          href: el.getAttribute('href') || '',
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
        });
      }

      return refs;
    }
  );

  if (!ok) return { error };
  return { elements: result, count: result.length, url: tab.url };
}

export async function waitForPopup(timeout = 10000, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  const startedAt = Date.now();
  const clampedTimeout = Math.min(Math.max(timeout, 500), 60000);

  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timer);
      chrome.tabs.onCreated.removeListener(listener);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'Timeout waiting for popup' });
    }, clampedTimeout);

    function listener(newTab) {
      if (newTab.openerTabId === tab.id || newTab.windowId === tab.windowId) {
        cleanup();
        resolve({
          success: true,
          tabId: newTab.id,
          windowId: newTab.windowId,
          url: newTab.pendingUrl || newTab.url || '',
          openerTabId: newTab.openerTabId ?? null,
          elapsed: Date.now() - startedAt,
        });
      }
    }

    chrome.tabs.onCreated.addListener(listener);
  });
}

export async function waitForDialog(timeout = 10000, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  const clampedTimeout = Math.min(Math.max(timeout, 500), 30000);

  // If a dialog already fired before this call (race condition), return immediately
  if (pendingDialogs.has(tab.id)) {
    const pending = pendingDialogs.get(tab.id);
    return { success: true, ...pending, tabId: tab.id };
  }

  const dbg = await acquireDebugger(tab.id);
  try {
    await dbg.send('Page.enable');

    // Check again after Page.enable in case it arrived between the check above and attach
    if (pendingDialogs.has(tab.id)) {
      const pending = pendingDialogs.get(tab.id);
      return { success: true, ...pending, tabId: tab.id };
    }

    return await new Promise((resolve) => {
      let settled = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        chrome.debugger.onEvent.removeListener(listener);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve({ success: false, error: 'Timeout waiting for dialog' });
      }, clampedTimeout);

      function listener(source, method, params) {
        if (source.tabId !== tab.id || method !== 'Page.javascriptDialogOpening') return;
        cleanup();
        resolve({
          success: true,
          type: params.type,
          message: params.message,
          defaultPrompt: params.defaultPrompt ?? '',
          tabId: tab.id,
        });
      }

      chrome.debugger.onEvent.addListener(listener);

      // Final check: dialog may have arrived between Page.enable and addListener
      if (pendingDialogs.has(tab.id)) {
        cleanup();
        const pending = pendingDialogs.get(tab.id);
        resolve({ success: true, ...pending, tabId: tab.id });
      }
    });
  } finally {
    releaseDebugger(tab.id);
  }
}

export async function handleDialog(accept = true, promptText = '', tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  const dbg = await acquireDebugger(tab.id);
  try {
    // Page.enable required so Chrome tracks dialog state after a debugger re-attach
    await dbg.send('Page.enable');
    await dbg.send('Page.handleJavaScriptDialog', {
      accept,
      promptText: promptText || '',
    });
    pendingDialogs.delete(tab.id);
    return { success: true, accept, promptText };
  } finally {
    releaseDebugger(tab.id);
  }
}

// Click element by selector
export async function click(selector, tabId, sessionId, verify = false, verifyTimeout = 150, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot click on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const rect = element.getBoundingClientRect();
        return {
          success: true,
          selector: sel,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
      }
      return { success: false, error: 'Element not found' };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  if (!result.success) return result;

  const clickResult = await clickAt(
    result.x,
    result.y,
    tab.id,
    sessionId,
    verify,
    verifyTimeout
  );

  return {
    ...clickResult,
    selector,
  };
}

export async function rightClick(selector, tabId, sessionId, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot right-click on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const rect = element.getBoundingClientRect();
        return {
          success: true,
          selector: sel,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
      }
      return { success: false, error: 'Element not found' };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  if (!result.success) return result;

  try {
    await dispatchMouseSequence(tab.id, result.x, result.y, {
      button: 'right',
      clickCount: 1,
      repeatCount: 1,
    });
  } catch (nativeError) {
    return { success: false, error: nativeError?.message || String(nativeError) };
  }

  return { success: true, selector };
}

export async function doubleClick(selector, tabId, sessionId, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot double-click on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        const rect = element.getBoundingClientRect();
        return {
          success: true,
          selector: sel,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
      }
      return { success: false, error: 'Element not found' };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  if (!result.success) return result;

  try {
    await dispatchMouseSequence(tab.id, result.x, result.y, {
      button: 'left',
      clickCount: 2,
      repeatCount: 2,
    });
  } catch (nativeError) {
    return { success: false, error: nativeError?.message || String(nativeError) };
  }

  return { success: true, selector };
}

// Type text into element
export async function type(selector, text, tabId, sessionId, verify = false, verifyTimeout = 1000, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot type on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) {
        return { success: false, error: 'Element not found' };
      }

      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const rect = element.getBoundingClientRect();
      return {
        success: true,
        selector: sel,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  if (!result.success) return result;

  await dispatchNativeClick(tab.id, result.x, result.y);

  const clearResult = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) {
        return { success: false, error: 'Element not found' };
      }

      element.focus();

      if ('value' in element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true };
      }

      if (element.isContentEditable || element.contentEditable === 'true') {
        element.innerHTML = '';
        element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '' }));
        return { success: true };
      }

      return { success: true };
    },
    [selector],
    null,   // frameId
    'MAIN'  // world — clear events must reach framework listeners (React, Vue, etc.)
  );

  if (!clearResult.ok) return { success: false, error: clearResult.error, restricted: clearResult.restricted };

  await insertNativeText(tab.id, text);

  if (!verify) {
    return { success: true, selector };
  }

  const verification = await waitForCondition(async () => {
    const { ok, result, error, restricted } = await safeExecuteScript(
      tab.id,
      (sel, expected) => {
        const element = document.querySelector(sel);
        if (!element) {
          return { success: false, error: 'Element not found' };
        }

        let actual = '';
        if ('value' in element && typeof element.value === 'string') {
          actual = element.value;
        } else if (element.isContentEditable || element.contentEditable === 'true') {
          actual = element.innerText || element.textContent || '';
        } else {
          actual = element.innerText || element.textContent || '';
        }

        return {
          success: true,
          actual,
          matches: actual === expected || actual.includes(expected),
        };
      },
      [selector, text]
    );

    if (!ok) {
      return {
        done: true,
        value: { success: false, error, restricted },
      };
    }

    if (!result.success) {
      return {
        done: true,
        value: result,
      };
    }

    if (result.matches) {
      return {
        done: true,
        value: {
          success: true,
          actual: result.actual,
          matches: true,
        },
      };
    }

    return { done: false };
  }, Math.min(verifyTimeout, 10000));

  return {
    success: true,
    selector,
    verification: verification || {
      success: false,
      matches: false,
      error: 'Timeout',
    },
  };
}

// Hover over element
export async function hover(selector, tabId, sessionId, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot hover on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const eventOptions = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: centerX,
          clientY: centerY,
        };

        element.dispatchEvent(
          new MouseEvent('mouseenter', { ...eventOptions, bubbles: false })
        );
        element.dispatchEvent(new MouseEvent('mouseover', eventOptions));
        element.dispatchEvent(new MouseEvent('mousemove', eventOptions));

        return { success: true, selector: sel };
      }
      return { success: false, error: 'Element not found' };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

// Scroll page or element
export async function scroll(
  direction = 'down',
  amount = 500,
  selector = null,
  tabId,
  sessionId
) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot scroll on restricted page', restricted: true };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (dir, amt, sel) => {
      let target = window;
      if (sel) {
        const element = document.querySelector(sel);
        if (!element) return { success: false, error: 'Element not found' };
        target = element;
      }

      const scrollAmount =
        dir === 'up' ? -amt : dir === 'down' ? amt : 0;
      const scrollAmountX =
        dir === 'left' ? -amt : dir === 'right' ? amt : 0;

      if (target === window) {
        window.scrollBy({
          top: scrollAmount,
          left: scrollAmountX,
          behavior: 'smooth',
        });
      } else {
        target.scrollBy({
          top: scrollAmount,
          left: scrollAmountX,
          behavior: 'smooth',
        });
      }

      return { success: true, direction: dir, amount: amt };
    },
    [direction, amount, selector]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

// Wait for element
export async function waitForElement(
  selector,
  timeout = 10000,
  tabId,
  sessionId,
  locator = null
) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot wait for elements on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  // Polling from extension side to avoid async issues in executeScript
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const { ok, result, error, restricted } = await safeExecuteScript(
      tab.id,
      (sel) => {
        const element = document.querySelector(sel);
        return element ? { found: true } : { found: false };
      },
      [selector]
    );

    if (!ok) return { success: false, error, restricted };
    if (result.found) return { success: true, selector, found: true };

    await new Promise(r => setTimeout(r, 100));
  }

  return { success: false, selector, found: false, error: 'Timeout' };
}

// Click at coordinates (physical viewport - no scaling needed)
// verify: true - capture pre/post state and detect click effects
// verifyTimeout: ms to wait for effects (default: 150, max: 1000)
export async function clickAt(x, y, tabId, sessionId, verify = false, verifyTimeout = 150) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot click on restricted page', restricted: true };
  }

  // Step 1: Capture pre-state
  const { ok: clickOk, result: clickResult, error: clickError, restricted: clickRestricted } = await safeExecuteScript(
    tab.id,
    (clickX, clickY, shouldVerify) => {
      // Pre-state capture (only if verify)
      let preState = null;
      let elemPre = null;

      const element = document.elementFromPoint(clickX, clickY);
      if (!element) {
        return { success: false, error: 'No element at coordinates' };
      }

      if (shouldVerify) {
        preState = {
          url: window.location.href,
          focusedTag: document.activeElement?.tagName,
          focusedId: document.activeElement?.id,
          modals: document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]').length,
          dropdowns: document.querySelectorAll('[role="listbox"], [role="menu"]').length,
        };
        elemPre = {
          className: element.className,
          ariaExpanded: element.getAttribute('aria-expanded'),
          checked: element.checked,
        };
      }

      return {
        success: true,
        x: clickX,
        y: clickY,
        element: {
          tagName: element.tagName,
          id: element.id,
          text: element.innerText?.substring(0, 100),
        },
        preState,
        elemPre,
      };
    },
    [x, y, verify]
  );

  if (!clickOk) return { success: false, error: clickError, restricted: clickRestricted };
  try {
    await dispatchNativeClick(tab.id, x, y);
  } catch (nativeError) {
    return { success: false, error: nativeError?.message || String(nativeError) };
  }
  if (!clickResult.success || !verify) {
    // Remove internal state from response
    delete clickResult.preState;
    delete clickResult.elemPre;
    return clickResult;
  }

  // Step 2: Wait for effects
  await new Promise(r => setTimeout(r, Math.min(verifyTimeout, 1000)));

  // Step 3: Capture post-state
  const { ok: postOk, result: postResult, error: postError, restricted: postRestricted } = await safeExecuteScript(
    tab.id,
    (clickX, clickY, preState, elemPre) => {
      const postState = {
        url: window.location.href,
        focusedTag: document.activeElement?.tagName,
        focusedId: document.activeElement?.id,
        modals: document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]').length,
        dropdowns: document.querySelectorAll('[role="listbox"], [role="menu"]').length,
      };

      // Try to get element at same coordinates for elemPost
      const element = document.elementFromPoint(clickX, clickY);
      const elemPost = element ? {
        className: element.className,
        ariaExpanded: element.getAttribute('aria-expanded'),
        checked: element.checked,
      } : null;

      // Build verification result
      const changes = [];
      if (preState.url !== postState.url) changes.push({ type: 'url', to: postState.url });
      if (preState.focusedTag !== postState.focusedTag) changes.push({ type: 'focus', to: postState.focusedTag });
      if (postState.modals > preState.modals) changes.push({ type: 'modal' });
      if (postState.dropdowns > preState.dropdowns) changes.push({ type: 'dropdown' });
      if (elemPost && JSON.stringify(elemPre) !== JSON.stringify(elemPost)) changes.push({ type: 'elementState' });

      return {
        hadEffect: changes.length > 0,
        changes,
      };
    },
    [x, y, clickResult.preState, clickResult.elemPre]
  );

  // Clean up and return final result
  delete clickResult.preState;
  delete clickResult.elemPre;

  if (!postOk) {
    // Click succeeded but verification failed - still return click result
    clickResult.verification = { error: postError, restricted: postRestricted };
  } else {
    clickResult.verification = postResult;
  }

  return clickResult;
}

// Find text on page
export async function findText(
  text,
  shouldClick = false,
  _filter = {},
  tabId,
  sessionId
) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { found: false, error: 'Cannot search on restricted page', restricted: true, url: tab.url };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (searchText, click) => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const matches = [];
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.includes(searchText)) continue;

        const parent = node.parentElement;
        if (!parent) continue;
        if (parent.offsetParent === null && parent.tagName !== 'BODY') continue;

        const rect = parent.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) continue;

        matches.push({
          text: node.textContent.trim().substring(0, 100),
          tagName: parent.tagName,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }

      if (matches.length === 0) {
        return { found: false, error: `Text "${searchText}" not found` };
      }

      matches.sort((a, b) => a.y - b.y || a.x - b.x);

      if (click && matches.length > 0) {
        const target = document.elementFromPoint(matches[0].x, matches[0].y);
        if (target) {
          target.click();
          return {
            found: true,
            clicked: true,
            match: matches[0],
            totalMatches: matches.length,
          };
        }
      }

      return {
        found: true,
        clicked: false,
        matches: matches.slice(0, 10),
        totalMatches: matches.length,
      };
    },
    [text, shouldClick]
  );

  if (!ok) return { found: false, error, restricted };
  return result;
}

// Press a keyboard key (Enter, Tab, Escape, etc.)
export async function pressKey(key, selector = null, tabId, sessionId, verify = false, verifyTimeout = 300, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot press keys on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  // selector is optional for pressKey — falls back to document.activeElement

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel, shouldVerify) => {
      const captureState = () => {
        const activeElement = document.activeElement;
        const selectedElement = sel ? document.querySelector(sel) : null;
        const target = selectedElement || activeElement || document.body;

        return {
          url: window.location.href,
          focusedTag: activeElement?.tagName || null,
          focusedId: activeElement?.id || null,
          activeValue: activeElement && 'value' in activeElement ? String(activeElement.value ?? '') : '',
          activeText: activeElement?.innerText || activeElement?.textContent || '',
          targetValue: target && 'value' in target ? String(target.value ?? '') : '',
          targetText: target?.innerText || target?.textContent || '',
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          modals: document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]').length,
          dropdowns: document.querySelectorAll('[role="listbox"], [role="menu"]').length,
        };
      };

      let target = document.activeElement || document.body;
      if (sel) {
        const element = document.querySelector(sel);
        if (element) {
          element.focus();
          target = element;
        }
      }
      return {
        success: true,
        target: target.tagName,
        preState: shouldVerify ? captureState() : null,
      };
    },
    [selector, verify]
  );

  if (!ok) return { success: false, error, restricted };
  if (!result.success) return result;

  await dispatchNativeKey(tab.id, key);

  if (!verify) {
    return { success: true, key, target: result.target };
  }

  await new Promise((resolve) => setTimeout(resolve, Math.min(verifyTimeout, 1000)));

  const postState = await safeExecuteScript(
    tab.id,
    (sel, before) => {
      const captureState = () => {
        const activeElement = document.activeElement;
        const selectedElement = sel ? document.querySelector(sel) : null;
        const target = selectedElement || activeElement || document.body;

        return {
          url: window.location.href,
          focusedTag: activeElement?.tagName || null,
          focusedId: activeElement?.id || null,
          activeValue: activeElement && 'value' in activeElement ? String(activeElement.value ?? '') : '',
          activeText: activeElement?.innerText || activeElement?.textContent || '',
          targetValue: target && 'value' in target ? String(target.value ?? '') : '',
          targetText: target?.innerText || target?.textContent || '',
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          modals: document.querySelectorAll('[role="dialog"], .modal, [aria-modal="true"]').length,
          dropdowns: document.querySelectorAll('[role="listbox"], [role="menu"]').length,
        };
      };

      const after = captureState();
      const changes = [];

      if (before.url !== after.url) changes.push({ type: 'url', to: after.url });
      if (before.focusedTag !== after.focusedTag || before.focusedId !== after.focusedId) {
        changes.push({ type: 'focus', to: { tag: after.focusedTag, id: after.focusedId } });
      }
      if (before.activeValue !== after.activeValue) changes.push({ type: 'activeValue' });
      if (before.activeText !== after.activeText) changes.push({ type: 'activeText' });
      if (before.targetValue !== after.targetValue) changes.push({ type: 'targetValue' });
      if (before.targetText !== after.targetText) changes.push({ type: 'targetText' });
      if (before.scrollX !== after.scrollX || before.scrollY !== after.scrollY) {
        changes.push({ type: 'scroll', to: { x: after.scrollX, y: after.scrollY } });
      }
      if (after.modals > before.modals) changes.push({ type: 'modal' });
      if (after.dropdowns > before.dropdowns) changes.push({ type: 'dropdown' });

      return {
        hadEffect: changes.length > 0,
        changes,
      };
    },
    [selector, result.preState]
  );

  if (!postState.ok) {
    return {
      success: true,
      key,
      target: result.target,
      verification: { success: false, error: postState.error, restricted: postState.restricted },
    };
  }

  return {
    success: true,
    key,
    target: result.target,
    verification: postState.result,
  };
}

export async function pressKeys(keys, selector = null, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot press keys on restricted page', restricted: true };
  }

  const keyList = Array.isArray(keys) ? keys.map((key) => String(key)) : [];
  if (keyList.length === 0) {
    return { success: false, error: 'No keys provided' };
  }

  const modifierBits = {
    Alt: 1,
    Control: 2,
    Meta: 4,
    Shift: 8,
  };

  const normalizeKeyInfo = (keyName) => {
    const key = String(keyName);
    const lower = key.toLowerCase();
    const singleCharKeyMap = {
      '0': { code: 'Digit0', keyCode: 48 },
      '1': { code: 'Digit1', keyCode: 49 },
      '2': { code: 'Digit2', keyCode: 50 },
      '3': { code: 'Digit3', keyCode: 51 },
      '4': { code: 'Digit4', keyCode: 52 },
      '5': { code: 'Digit5', keyCode: 53 },
      '6': { code: 'Digit6', keyCode: 54 },
      '7': { code: 'Digit7', keyCode: 55 },
      '8': { code: 'Digit8', keyCode: 56 },
      '9': { code: 'Digit9', keyCode: 57 },
      '/': { code: 'Slash', keyCode: 191 },
      '-': { code: 'Minus', keyCode: 189 },
      '=': { code: 'Equal', keyCode: 187 },
      '[': { code: 'BracketLeft', keyCode: 219 },
      ']': { code: 'BracketRight', keyCode: 221 },
      '`': { code: 'Backquote', keyCode: 192 },
      '\\': { code: 'Backslash', keyCode: 220 },
      ';': { code: 'Semicolon', keyCode: 186 },
      "'": { code: 'Quote', keyCode: 222 },
      ',': { code: 'Comma', keyCode: 188 },
      '.': { code: 'Period', keyCode: 190 },
    };

    if (lower === 'control' || lower === 'ctrl') {
      return { key: 'Control', code: 'ControlLeft', keyCode: 17, bit: modifierBits.Control, modifier: true };
    }
    if (lower === 'shift') {
      return { key: 'Shift', code: 'ShiftLeft', keyCode: 16, bit: modifierBits.Shift, modifier: true };
    }
    if (lower === 'alt' || lower === 'option') {
      return { key: 'Alt', code: 'AltLeft', keyCode: 18, bit: modifierBits.Alt, modifier: true };
    }
    if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
      return { key: 'Meta', code: 'MetaLeft', keyCode: 91, bit: modifierBits.Meta, modifier: true };
    }
    if (key.length === 1) {
      const upper = key.toUpperCase();
      const isLetter = /^[A-Z]$/.test(upper);
      const singleChar = singleCharKeyMap[key];

      if (singleChar) {
        return {
          key,
          code: singleChar.code,
          keyCode: singleChar.keyCode,
          text: key,
          modifier: false,
        };
      }

      return {
        key,
        code: isLetter ? `Key${upper}` : key,
        keyCode: isLetter ? upper.charCodeAt(0) : 0,
        text: key,
        modifier: false,
      };
    }

    const specialKeyMap = {
      Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
      Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
      Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
      Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
      ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
      ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
      ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
      ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
      Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
      Home: { key: 'Home', code: 'Home', keyCode: 36 },
      End: { key: 'End', code: 'End', keyCode: 35 },
      PageUp: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
      PageDown: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
      Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
    };

    const special = specialKeyMap[key];
    if (special) {
      return { ...special, modifier: false };
    }

    return { key, code: key, keyCode: 0, modifier: false };
  };

  const prefixKeys = keyList.slice(0, -1);
  const finalKey = keyList[keyList.length - 1];
  const heldModifiers = [];
  let modifiersMask = 0;

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = sel ? document.querySelector(sel) : document.activeElement;
      if (sel && !element) {
        return { success: false, error: `Element not found: ${sel}` };
      }

      if (element && element !== document.body) {
        element.focus?.();
        element.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'instant' });
      }

      return { success: true };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  if (!result.success) return result;

  const dbg = await acquireDebugger(tab.id);
  try {
    for (const keyName of prefixKeys) {
      const info = normalizeKeyInfo(keyName);
      if (info.modifier) {
        heldModifiers.push(info);
        modifiersMask |= info.bit || 0;
      }

      await dbg.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: info.key,
        code: info.code,
        windowsVirtualKeyCode: info.keyCode,
        nativeVirtualKeyCode: info.keyCode,
        modifiers: modifiersMask,
        text: info.text,
        unmodifiedText: info.text,
      });
    }

    const finalInfo = normalizeKeyInfo(finalKey);
    const finalHasText = Boolean(finalInfo.text || finalKey.length === 1);
    const finalText = finalInfo.text || (finalKey.length === 1 ? finalKey : undefined);

    await dbg.send('Input.dispatchKeyEvent', {
      type: finalHasText ? 'keyDown' : 'rawKeyDown',
      key: finalInfo.key,
      code: finalInfo.code,
      windowsVirtualKeyCode: finalInfo.keyCode,
      nativeVirtualKeyCode: finalInfo.keyCode,
      modifiers: modifiersMask,
      text: finalText,
      unmodifiedText: finalText,
    });

    if (finalHasText) {
      await dbg.send('Input.dispatchKeyEvent', {
        type: 'char',
        key: finalInfo.key,
        code: finalInfo.code,
        windowsVirtualKeyCode: finalInfo.keyCode,
        nativeVirtualKeyCode: finalInfo.keyCode,
        modifiers: modifiersMask,
        text: finalText,
        unmodifiedText: finalText,
      });
    }

    await dbg.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: finalInfo.key,
      code: finalInfo.code,
      windowsVirtualKeyCode: finalInfo.keyCode,
      nativeVirtualKeyCode: finalInfo.keyCode,
      modifiers: modifiersMask,
      text: finalText,
      unmodifiedText: finalText,
    });

    for (let i = heldModifiers.length - 1; i >= 0; i -= 1) {
      const info = heldModifiers[i];
      modifiersMask &= ~(info.bit || 0);
      await dbg.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: info.key,
        code: info.code,
        windowsVirtualKeyCode: info.keyCode,
        nativeVirtualKeyCode: info.keyCode,
        modifiers: modifiersMask,
      });
    }

    return {
      success: true,
      keys: keyList,
      selector: selector || null,
    };
  } finally {
    releaseDebugger(tab.id);
  }
}

export async function selectOption(selector, value, tabId, sessionId, locator = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot select on restricted page', restricted: true };
  }

  if (!selector && locator) {
    const resolved = await resolveLocator(tab.id, locator);
    if (!resolved.ok) return { success: false, error: resolved.error, restricted: resolved.restricted };
    selector = resolved.selector;
  }
  if (!selector) {
    return { success: false, error: 'selector or locator is required', restricted: false };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel, expected) => {
      const element = document.querySelector(sel);
      if (!element) {
        return { success: false, error: `Element not found: ${sel}` };
      }

      if (element.tagName !== 'SELECT') {
        return { success: false, error: 'Target element is not a <select>' };
      }

      const targetValue = String(expected ?? '').trim();
      const options = Array.from(element.options || []);
      const normalize = (text) => String(text ?? '').trim();

      let matchedOption = options.find((option) => normalize(option.value) === targetValue);
      if (!matchedOption) {
        matchedOption = options.find((option) => normalize(option.textContent) === targetValue);
      }
      if (!matchedOption) {
        const lowerExpected = targetValue.toLowerCase();
        matchedOption = options.find((option) => normalize(option.value).toLowerCase() === lowerExpected);
      }
      if (!matchedOption) {
        const lowerExpected = targetValue.toLowerCase();
        matchedOption = options.find((option) => normalize(option.textContent).toLowerCase() === lowerExpected);
      }

      if (!matchedOption) {
        return { success: false, error: `No option matched value or text: ${expected}` };
      }

      element.value = matchedOption.value;
      // Use MAIN world (ensured by caller) so that inline onchange handlers
      // and framework event listeners (React, Vue, etc.) fire correctly.
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      return {
        success: true,
        selector: sel,
        selectedValue: matchedOption.value,
        selectedText: matchedOption.textContent?.trim() || '',
      };
    },
    [selector, value],
    null,   // frameId
    'MAIN'  // world — required for events to reach inline/framework handlers
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

export async function dragAndDrop(sourceSelector, targetSelector, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot drag and drop on restricted page', restricted: true };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sourceSel, targetSel) => {
      const source = document.querySelector(sourceSel);
      const target = document.querySelector(targetSel);

      if (!source) return { success: false, error: `Source element not found: ${sourceSel}` };
      if (!target) return { success: false, error: `Target element not found: ${targetSel}` };

      source.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });

      const dataTransfer = new DataTransfer();
      const sourceText = (source.innerText || source.textContent || '').trim();

      const fire = (element, type) => {
        const event = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        return element.dispatchEvent(event);
      };

      fire(source, 'pointerdown');
      fire(source, 'mousedown');
      const dragStartAccepted = fire(source, 'dragstart');
      fire(target, 'dragenter');
      fire(target, 'dragover');
      const dropAccepted = fire(target, 'drop');
      fire(source, 'dragend');
      fire(target, 'mouseup');

      return {
        success: true,
        sourceSelector: sourceSel,
        targetSelector: targetSel,
        sourceTag: source.tagName,
        targetTag: target.tagName,
        sourceText: sourceText.slice(0, 120),
        dragStartAccepted,
        dropAccepted,
      };
    },
    [sourceSelector, targetSelector]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

export async function uploadFile(selector, filePaths, tabId, sessionId, verify = false, verifyTimeout = 1000) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot upload files on restricted page', restricted: true };
  }

  const paths = normalizeUploadPaths(filePaths);
  if (!paths.length) {
    return { success: false, error: 'No file paths provided' };
  }

  if (paths.some((entry) => !entry.startsWith('/'))) {
    return { success: false, error: 'File paths must be absolute' };
  }

  const fileNames = paths.map(getFileNameFromPath);
  const preCheck = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) {
        return { success: false, error: 'Element not found' };
      }

      if (element.tagName !== 'INPUT' || element.type !== 'file') {
        return { success: false, error: 'Target element is not an <input type=file>' };
      }

      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });

      return {
        success: true,
        multiple: element.multiple,
        accept: element.accept || '',
        existingFiles: Array.from(element.files || []).map((file) => file.name),
      };
    },
    [selector]
  );

  if (!preCheck.ok) {
    return { success: false, error: preCheck.error, restricted: preCheck.restricted };
  }
  if (!preCheck.result.success) {
    return preCheck.result;
  }

  if (!preCheck.result.multiple && paths.length > 1) {
    return { success: false, error: 'Target file input does not accept multiple files' };
  }

  const dbg = await acquireDebugger(tab.id);
  try {
    await dbg.send('DOM.enable');
    const { root } = await dbg.send('DOM.getDocument', { depth: -1, pierce: true });
    const { nodeId } = await dbg.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector,
    });

    if (!nodeId) {
      throw new Error(`Element not found: ${selector}`);
    }

    await dbg.send('DOM.setFileInputFiles', {
      nodeId,
      files: paths,
    });
  } finally {
    releaseDebugger(tab.id);
  }

  if (!verify) {
    return {
      success: true,
      selector,
      fileNames,
      fileCount: paths.length,
      multiple: preCheck.result.multiple,
    };
  }

  const verification = await waitForCondition(async () => {
    const { ok, result, error, restricted } = await safeExecuteScript(
      tab.id,
      (sel, expectedNames) => {
        const element = document.querySelector(sel);
        if (!element) {
          return { success: false, error: 'Element not found' };
        }

        const selectedNames = Array.from(element.files || []).map((file) => file.name);
        const matches =
          selectedNames.length === expectedNames.length &&
          expectedNames.every((name) => selectedNames.includes(name));

        return {
          success: true,
          selectedNames,
          fileCount: selectedNames.length,
          matches,
        };
      },
      [selector, fileNames]
    );

    if (!ok) {
      return {
        done: true,
        value: { success: false, error, restricted },
      };
    }

    if (!result.success) {
      return { done: true, value: result };
    }

    if (result.matches) {
      return {
        done: true,
        value: {
          success: true,
          fileCount: result.fileCount,
          selectedNames: result.selectedNames,
          matches: true,
        },
      };
    }

    return { done: false };
  }, Math.min(verifyTimeout, 10000));

  return {
    success: true,
    selector,
    fileNames,
    fileCount: paths.length,
    multiple: preCheck.result.multiple,
    verification: verification || {
      success: false,
      matches: false,
      error: 'Timeout',
    },
  };
}

export async function reload(tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  await chrome.tabs.reload(tab.id);
  return await waitForTabUrl(tab.id, () => true, 15000);
}

export async function back(tabId, sessionId, timeout = 10000) {
  const tab = await getTargetTab(tabId, sessionId);
  const startUrl = tab.url || '';

  const { ok, error, restricted } = await safeExecuteScript(
    tab.id,
    () => {
      history.back();
      return { success: true };
    }
  );

  if (!ok) return { success: false, error, restricted };
  return await waitForTabUrl(tab.id, (url) => url !== startUrl, timeout);
}

export async function forward(tabId, sessionId, timeout = 10000) {
  const tab = await getTargetTab(tabId, sessionId);
  const startUrl = tab.url || '';

  const { ok, error, restricted } = await safeExecuteScript(
    tab.id,
    () => {
      history.forward();
      return { success: true };
    }
  );

  if (!ok) return { success: false, error, restricted };
  return await waitForTabUrl(tab.id, (url) => url !== startUrl, timeout);
}

export async function waitForUrl(expected, match = 'includes', timeout = 10000, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  const predicate = (url) => {
    if (match === 'equals') return url === expected;
    if (match === 'regex') {
      try {
        return new RegExp(expected).test(url);
      } catch {
        return false;
      }
    }
    return url.includes(expected);
  };

  const result = await waitForTabUrl(tab.id, predicate, timeout);
  return {
    ...result,
    expected,
    match,
  };
}

export async function waitForText(text, timeout = 10000, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot wait for text on restricted page', restricted: true };
  }

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const { ok, result, error, restricted } = await safeExecuteScript(
      tab.id,
      (needle) => {
        const bodyText = document.body?.innerText || '';
        return { found: bodyText.includes(needle) };
      },
      [text]
    );

    if (!ok) return { success: false, error, restricted };
    if (result.found) {
      return { success: true, found: true, text };
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  return { success: false, found: false, text, error: 'Timeout' };
}

export async function waitForRequest(
  url,
  match = 'includes',
  method = null,
  status = null,
  timeout = 15000,
  reload = false,
  tabId,
  sessionId
) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot wait for network requests on restricted page', restricted: true };
  }

  return await watchNetwork(tab.id, {
    reload,
    timeout,
    predicate: (observer) => {
      const entries = Array.from(observer.requestMap.values()).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      const matchEntry = entries.find((entry) => matchesNetworkEntry(entry, { url, match, method, status }));

      if (matchEntry) {
        const completeEnough = status === null || status === undefined
          ? Boolean(matchEntry.finished || matchEntry.failed || matchEntry.status)
          : Number(matchEntry.status) === Number(status);

        if (completeEnough) {
          return {
            done: true,
            value: {
              success: true,
              request: matchEntry,
              tabId: tab.id,
            },
          };
        }
      }

      return { done: false };
    },
  });
}

export async function waitForNetworkIdle(idleTime = 1000, timeout = 15000, reload = false, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot wait for network idle on restricted page', restricted: true };
  }

  const clampedIdle = Math.min(Math.max(idleTime, 100), 10000);

  return await watchNetwork(tab.id, {
    reload,
    timeout,
    predicate: (observer) => {
      const quietFor = Date.now() - observer.lastNetworkActivityAt;
      if (observer.activeRequests.size === 0 && quietFor >= clampedIdle) {
        return {
          done: true,
          value: {
            success: true,
            idleTime: clampedIdle,
            observedRequests: Array.from(observer.requestMap.values()).slice(-20),
            tabId: tab.id,
          },
        };
      }

      return { done: false };
    },
  });
}

// Execute JavaScript code (uses debugger to bypass CSP)
export async function executeScript(code, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot execute script on restricted page', restricted: true };
  }

  return await withTabMutex(tab.id, async () => {
    const dbg = await acquireDebugger(tab.id);
    try {
      await dbg.send('Runtime.enable');

      // Wrap user code so the result is always JSON-serializable (avoids "Value is unserializable").
      // The wrapper runs user code inside a function (so `return` works), then coerces
      // the result to a serializable form: primitives pass through, objects are JSON-cloned,
      // and non-serializable values (DOM nodes, functions, etc.) fall back to String().
      const wrappedCode = `(async function() {
  const __serialize = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return String(value); }
  };
  const __r = await (async function() { ${code} })();
  return __serialize(__r);
})()`;

      const result = await dbg.send('Runtime.evaluate', {
        expression: wrappedCode,
        returnByValue: true,
        awaitPromise: true,
      });

      if (result.exceptionDetails) {
        return { success: false, error: result.exceptionDetails.text || 'Script error' };
      }

      return { success: true, result: result.result?.value };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      releaseDebugger(tab.id);
    }
  });
}

export async function waitForFunction(expression, timeout = 10000, interval = 200, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);
  const clampedTimeout = Math.min(Math.max(timeout, 500), 60000);
  const clampedInterval = Math.min(Math.max(interval, 50), 5000);
  const startedAt = Date.now();

  return await withTabMutex(tab.id, async () => {
    const dbg = await acquireDebugger(tab.id);
    try {
      while (Date.now() - startedAt < clampedTimeout) {
        const result = await dbg.send('Runtime.evaluate', {
          expression: `!!(${expression})`,
          returnByValue: true,
          awaitPromise: true,
          userGesture: false,
        });

        if (result?.result?.value === true) {
          return {
            success: true,
            elapsed: Date.now() - startedAt,
            tabId: tab.id,
          };
        }

        await new Promise((r) => setTimeout(r, clampedInterval));
      }

      return {
        success: false,
        error: 'Timeout',
        elapsed: Date.now() - startedAt,
        tabId: tab.id,
      };
    } finally {
      releaseDebugger(tab.id);
    }
  });
}

// Paste text into focused element (direct insertion, no clipboard API)
export async function paste(text, selector = null, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot paste on restricted page', restricted: true };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (txt, sel) => {
      // Get target element
      let target = document.activeElement;
      if (sel) {
        const element = document.querySelector(sel);
        if (element) {
          element.focus();
          target = element;
        } else {
          return { success: false, error: `Element not found: ${sel}` };
        }
      }

      if (!target || target === document.body) {
        return { success: false, error: 'No element focused' };
      }

      try {
        // Method 1: INPUT/TEXTAREA - direct value set
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          target.value = target.value.slice(0, start) + txt + target.value.slice(end);
          target.selectionStart = target.selectionEnd = start + txt.length;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, target: target.tagName, selector: sel, textLength: txt.length };
        }

        // Method 2: ContentEditable - use execCommand
        if (target.isContentEditable || target.contentEditable === 'true') {
          // Clear existing content if any, then insert
          document.execCommand('insertText', false, txt);
          target.dispatchEvent(new InputEvent('input', { bubbles: true, data: txt }));
          return { success: true, target: target.tagName, selector: sel, textLength: txt.length };
        }

        // Method 3: Fallback - simulate paste event
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', txt);
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: clipboardData
        });
        target.dispatchEvent(pasteEvent);

        return { success: true, target: target.tagName, selector: sel, textLength: txt.length };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    [text, selector],
    null,   // frameId
    'MAIN'  // world — paste events must reach framework listeners
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

// Start recording tab as video frames using Chrome Debugger API (Page.captureScreenshot loop)
// If execute is provided, runs the JS code during recording and returns frames when done
export async function recordStart(tabId, sessionId, maxDuration = 30000, execute = null) {
  const tab = await getTargetTab(tabId, sessionId);
  const targetTabId = tab.id;

  // Check if already recording
  if (activeRecordings.has(targetTabId)) {
    return { success: false, error: 'Already recording this tab' };
  }

  // Validate maxDuration (max 60 seconds)
  const duration = Math.min(Math.max(maxDuration, 1000), 60000);

  return await withTabMutex(targetTabId, async () => {
    // Initialize recording state
    const recording = {
      frames: [],
      startTime: Date.now(),
      maxDuration: duration,
      timer: null,
      captureInterval: null,
      stopped: false,
      stoppedAt: null,
      tabId: targetTabId,
    };
    activeRecordings.set(targetTabId, recording);

    try {
      const dbg = await acquireDebugger(targetTabId);
      try {
        // Enable Page and Runtime domains
        await dbg.send('Page.enable');
        await dbg.send('Runtime.enable');

        // Capture screenshot every 100ms (~10 fps)
        const captureFrame = async () => {
          if (recording.stopped) return;
          try {
            const result = await dbg.send('Page.captureScreenshot', {
              format: 'jpeg',
              quality: 80,
            });
            if (result?.data) {
              recording.frames.push({
                data: result.data,
                timestamp: Date.now() - recording.startTime,
              });
            }
          } catch (e) {
            console.warn(`[Helm] Frame capture error: ${e.message}`);
          }
        };

        // Start capture loop
        recording.captureInterval = setInterval(captureFrame, 100);
        await captureFrame(); // First frame immediately

        // Execute code and record
        console.log(`[Helm] Recording with execute for tab ${targetTabId}`);

        let executeResult = null;
        let executeError = null;

        try {
          // Wrap code in async IIFE for await support
          const wrappedCode = `(async () => { ${execute} })()`;

          // Execute the code via debugger (same session, no extra attach)
          const result = await dbg.send('Runtime.evaluate', {
            expression: wrappedCode,
            returnByValue: true,
            awaitPromise: true, // Wait for async code
          });

          if (result.exceptionDetails) {
            executeError = result.exceptionDetails.text || 'Script error';
          } else {
            executeResult = result.result?.value;
          }
        } catch (e) {
          executeError = e.message;
        }

        // Small delay to capture final state
        await new Promise(r => setTimeout(r, 200));
        await captureFrame(); // Capture final frame

        // Stop recording
        recording.stopped = true;
        recording.stoppedAt = Date.now();

        if (recording.captureInterval) {
          clearInterval(recording.captureInterval);
        }

        const frames = recording.frames;
        const recordingDuration = recording.stoppedAt - recording.startTime;

        console.log(`[Helm] Recording complete: ${frames.length} frames in ${recordingDuration}ms`);

        return {
          success: true,
          tabId: targetTabId,
          frameCount: frames.length,
          duration: recordingDuration,
          fps: frames.length > 0 ? Math.round(frames.length / (recordingDuration / 1000)) : 0,
          frames,
          executeResult,
          executeError,
        };
      } catch (e) {
        return { success: false, error: `Failed to record: ${e.message}` };
      } finally {
        releaseDebugger(targetTabId);
      }
    } catch (e) {
      return { success: false, error: `Failed to record: ${e.message}` };
    } finally {
      activeRecordings.delete(targetTabId);
    }
  });
}

function serializeDownloadItem(item) {
  return {
    id: item.id,
    url: item.url,
    finalUrl: item.finalUrl,
    filename: item.filename,
    mime: item.mime,
    fileSize: item.fileSize,
    bytesReceived: item.bytesReceived,
    totalBytes: item.totalBytes,
    state: item.state,
    danger: item.danger,
    exists: item.exists,
    error: item.error,
    startTime: item.startTime,
    endTime: item.endTime,
  };
}

export async function waitForDownload(timeout = 15000, filenameContains = null) {
  const startedAt = Date.now();
  const normalizedFilter = filenameContains ? String(filenameContains).toLowerCase() : null;
  const initialItems = await chrome.downloads.search({ limit: 100 });
  const baselineIds = new Set(initialItems.map((item) => item.id));

  const hasMatchingName = (item) => {
    if (!item) return false;
    if (!normalizedFilter) return true;

    const haystack = `${item.filename || ''} ${item.finalUrl || ''} ${item.url || ''}`.toLowerCase();
    return haystack.includes(normalizedFilter);
  };

  const isFreshItem = (item) => {
    if (!item) return false;
    if (!baselineIds.has(item.id)) return true;

    const itemStartedAt = item.startTime ? new Date(item.startTime).getTime() : 0;
    return Boolean(itemStartedAt && itemStartedAt + 1000 >= startedAt);
  };

  const matchesFilter = (item) => hasMatchingName(item) && isFreshItem(item);

  const findMatchingDownload = async () => {
    const items = await chrome.downloads.search({ limit: 100 });
    return items
      .filter(matchesFilter)
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTime - aTime;
      })[0] || null;
  };

  return await new Promise((resolve) => {
    let settled = false;
    let activeDownloadId = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poller);
      chrome.downloads.onCreated.removeListener(onCreated);
      chrome.downloads.onChanged.removeListener(onChanged);
      resolve(result);
    };

    const inspectDownload = async (downloadId) => {
      const [item] = await chrome.downloads.search({ id: downloadId });
      if (!item || !matchesFilter(item)) return;

      activeDownloadId = item.id;
      if (item.state === 'complete') {
        finish({ success: true, download: serializeDownloadItem(item) });
        return;
      }

      if (item.state === 'interrupted') {
        finish({
          success: false,
          error: `Download interrupted${item.error ? `: ${item.error}` : ''}`,
          download: serializeDownloadItem(item),
        });
      }
    };

    const onCreated = (item) => {
      if (!matchesFilter(item)) return;
      activeDownloadId = item.id;
      void inspectDownload(item.id);
    };

    const onChanged = (delta) => {
      if (activeDownloadId !== null && delta.id !== activeDownloadId) return;
      void inspectDownload(delta.id);
    };

    chrome.downloads.onCreated.addListener(onCreated);
    chrome.downloads.onChanged.addListener(onChanged);

    const timer = setTimeout(() => {
      void chrome.downloads.search({ limit: 10, orderBy: ['-startTime'] }).then((items) => {
        finish({
          success: false,
          error: 'Timeout',
          filenameContains,
          recentDownloads: items.map(serializeDownloadItem),
        });
      }).catch((error) => {
        finish({
          success: false,
          error: 'Timeout',
          filenameContains,
          debugError: error?.message || String(error),
        });
      });
    }, Math.min(Math.max(timeout, 1000), 120000));

    const poller = setInterval(() => {
      void findMatchingDownload().then((item) => {
        if (item) {
          void inspectDownload(item.id);
        }
      });
    }, 250);

    void findMatchingDownload().then((item) => {
      if (item) {
        void inspectDownload(item.id);
      }
    });
  });
}

async function waitForDownloadById(downloadId, timeout = 15000) {
  return await new Promise((resolve) => {
    let settled = false;

    const finish = async (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener(onChanged);
      resolve(result);
    };

    const inspect = async () => {
      const [item] = await chrome.downloads.search({ id: downloadId });
      if (!item) {
        await finish({ success: false, error: 'Download not found', downloadId });
        return;
      }

      if (item.state === 'complete') {
        await finish({ success: true, download: serializeDownloadItem(item) });
        return;
      }

      if (item.state === 'interrupted') {
        await finish({
          success: false,
          error: `Download interrupted${item.error ? `: ${item.error}` : ''}`,
          download: serializeDownloadItem(item),
        });
      }
    };

    const onChanged = (delta) => {
      if (delta.id !== downloadId) return;
      void inspect();
    };

    const timer = setTimeout(async () => {
      const [item] = await chrome.downloads.search({ id: downloadId });
      await finish({
        success: false,
        error: 'Timeout',
        download: item ? serializeDownloadItem(item) : null,
        downloadId,
      });
    }, Math.min(Math.max(timeout, 1000), 120000));

    chrome.downloads.onChanged.addListener(onChanged);
    void inspect();
  });
}

export async function downloadUrl(url, filename = null, saveAs = false, wait = true, timeout = 15000) {
  const options = {
    url,
    saveAs: Boolean(saveAs),
    conflictAction: 'uniquify',
  };

  if (filename) {
    options.filename = filename;
  }

  try {
    const downloadId = await chrome.downloads.download(options);

    if (!wait) {
      return {
        success: true,
        downloadId,
        url,
        filename: filename || null,
        saveAs: Boolean(saveAs),
      };
    }

    const result = await waitForDownloadById(downloadId, timeout);
    return {
      ...result,
      downloadId,
      url,
      filename: filename || null,
      saveAs: Boolean(saveAs),
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || String(error),
      url,
      filename: filename || null,
      saveAs: Boolean(saveAs),
    };
  }
}

// Handle debugger events (screencast frames)
export function handleDebuggerEvent(source, method, params) {
  const tabId = source.tabId;

  if (tabId !== undefined) {
    for (const observer of activeObservers.values()) {
      if (observer?.tabId !== tabId) {
        continue;
      }

      if (method === 'Runtime.consoleAPICalled') {
        observer.consoleEntries.push({
          type: 'console',
          level: params.type,
          text: (params.args || []).map(serializeRemoteObject).filter((v) => v !== null).join(' '),
          timestamp: params.timestamp,
        });
      } else if (method === 'Runtime.exceptionThrown') {
        observer.consoleEntries.push({
          type: 'exception',
          level: 'error',
          text: params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || 'Unhandled exception',
          timestamp: params.timestamp || Date.now(),
        });
      } else if (method === 'Log.entryAdded') {
        observer.consoleEntries.push({
          type: 'log',
          level: params.entry?.level || 'info',
          text: params.entry?.text || '',
          source: params.entry?.source,
          timestamp: params.entry?.timestamp || Date.now(),
          url: params.entry?.url,
        });
      } else if (method === 'Network.requestWillBeSent') {
        observer.lastNetworkActivityAt = Date.now();
        observer.activeRequests?.add(params.requestId);
        observer.requestMap.set(params.requestId, {
          requestId: params.requestId,
          url: params.request?.url,
          method: params.request?.method,
          resourceType: params.type,
          startedAt: params.timestamp,
        });
      } else if (method === 'Network.responseReceived') {
        observer.lastNetworkActivityAt = Date.now();
        const entry = observer.requestMap.get(params.requestId) || { requestId: params.requestId };
        observer.requestMap.set(params.requestId, {
          ...entry,
          url: entry.url || params.response?.url,
          resourceType: entry.resourceType || params.type,
          status: params.response?.status,
          statusText: params.response?.statusText,
          mimeType: params.response?.mimeType,
          protocol: params.response?.protocol,
        });
      } else if (method === 'Network.loadingFailed') {
        observer.lastNetworkActivityAt = Date.now();
        observer.activeRequests?.delete(params.requestId);
        const entry = observer.requestMap.get(params.requestId) || { requestId: params.requestId };
        observer.requestMap.set(params.requestId, {
          ...entry,
          failed: true,
          errorText: params.errorText,
          canceled: params.canceled,
        });
      } else if (method === 'Network.loadingFinished') {
        observer.lastNetworkActivityAt = Date.now();
        observer.activeRequests?.delete(params.requestId);
        const entry = observer.requestMap.get(params.requestId) || { requestId: params.requestId };
        observer.requestMap.set(params.requestId, {
          ...entry,
          finished: true,
          encodedDataLength: params.encodedDataLength,
        });
      }

      if (observer.consoleEntries.length > 200) {
        observer.consoleEntries = observer.consoleEntries.slice(-200);
      }
    }
  }

  // Track pending dialogs globally so waitForDialog can detect already-open ones
  if (method === 'Page.javascriptDialogOpening' && tabId !== undefined) {
    pendingDialogs.set(tabId, {
      type: params.type,
      message: params.message,
      defaultPrompt: params.defaultPrompt ?? '',
    });
  } else if (method === 'Page.javascriptDialogClosed' && tabId !== undefined) {
    pendingDialogs.delete(tabId);
  }

  if (method !== 'Page.screencastFrame') {
    return;
  }

  const recording = activeRecordings.get(tabId);
  if (!recording) {
    console.log(`[Helm] Frame received but no recording for tab ${tabId}`);
    return;
  }

  recording.frames.push({
    data: params.data,
    timestamp: Date.now() - recording.startTime,
    metadata: params.metadata,
  });

  console.log(`[Helm] Frame ${recording.frames.length} captured for tab ${tabId}`);

  chrome.debugger.sendCommand({ tabId }, 'Page.screencastFrameAck', {
    sessionId: params.sessionId,
  }).then(() => {
    console.log(`[Helm] Frame ack sent for tab ${tabId}`);
  }).catch((e) => {
    console.error(`[Helm] Frame ack failed: ${e.message}`);
  });
}

export async function getDebugStatus() {
  const sessions = [];
  for (const [tabId, session] of debuggerSessions) {
    sessions.push({
      tabId,
      attached: session.attached,
      refCount: session.refCount,
      hasPendingDetach: !!session.detachTimer,
      hasAttachInFlight: !!session.attachPromise,
    });
  }

  const observers = [];
  for (const obs of activeObservers.values()) {
    observers.push({
      tabId: obs.tabId,
      consoleEntries: obs.consoleEntries?.length ?? 0,
      networkEntries: obs.networkEntries?.length ?? 0,
      age: Date.now() - (obs.startedAt ?? Date.now()),
    });
  }

  const recordings = [];
  for (const [tabId, rec] of activeRecordings) {
    recordings.push({
      tabId,
      frames: rec.frames?.length ?? 0,
      age: Date.now() - (rec.startTime ?? Date.now()),
    });
  }

  return { debuggerSessions: sessions, observers, recordings };
}
