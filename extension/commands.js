// Helm - DOM Commands

import { getTargetTab } from './tabs.js';
import { getWindowIdForSession, WINDOW_WIDTH, WINDOW_HEIGHT, BROWSER_ZOOM } from './windows.js';

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

function isRestrictedUrl(url) {
  if (!url) return true;
  if (RESTRICTED_PATTERNS.some(p => p.test(url))) return true;
  if (ERROR_INDICATORS.some(e => url.includes(e))) return true;
  return false;
}

// Safe executeScript wrapper - catches error page exceptions and edge cases
async function safeExecuteScript(tabId, func, args = []) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args,
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
export async function screenshot(tabId, sessionId, selector = null) {
  const windowId = getWindowIdForSession(sessionId);
  const captureWindowId = windowId || null;

  // Get element bounds if selector provided
  let elementBounds = null;
  if (selector) {
    const tab = await getTargetTab(tabId, sessionId);

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

  const jpegUrl = await chrome.tabs.captureVisibleTab(captureWindowId, {
    format: 'jpeg',
    quality: 90,
  });

  // Convert to WebP and optionally crop
  try {
    const response = await fetch(jpegUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Calculate device pixel ratio for accurate cropping
    const dpr = bitmap.width / (await getViewportWidth(tabId, sessionId));

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
}

// Helper to get viewport width for DPR calculation
async function getViewportWidth(tabId, sessionId) {
  try {
    const tab = await getTargetTab(tabId, sessionId);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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

// Get element text content (bypasses CSP, no eval)
// index: null = first match, -1 = last match, 0+ = specific index
export async function getElementText(selector, tabId, sessionId, index = null) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { error: 'Cannot query elements on restricted page', restricted: true, url: tab.url };
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

// Click element by selector
export async function click(selector, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot click on restricted page', restricted: true };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.click();
        return { success: true, selector: sel };
      }
      return { success: false, error: 'Element not found' };
    },
    [selector]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

// Type text into element
export async function type(selector, text, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot type on restricted page', restricted: true };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (sel, txt) => {
      const element = document.querySelector(sel);
      if (!element) {
        return { success: false, error: 'Element not found' };
      }

      element.focus();

      if (
        'value' in element &&
        (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
      ) {
        element.value = txt;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (
        element.isContentEditable ||
        element.contentEditable === 'true'
      ) {
        element.innerHTML = '';
        document.execCommand('insertText', false, txt);
        element.dispatchEvent(
          new InputEvent('input', { bubbles: true, data: txt })
        );
      } else {
        element.innerText = txt;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return { success: true, selector: sel, text: txt };
    },
    [selector, text]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

// Hover over element
export async function hover(selector, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot hover on restricted page', restricted: true };
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
  sessionId
) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot wait for elements on restricted page', restricted: true };
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

  // Step 1: Click and capture pre-state
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

      // Dispatch click events
      ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        element.dispatchEvent(new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: clickX,
          clientY: clickY,
          button: 0,
        }));
      });

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
  filter = {},
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
export async function pressKey(key, selector = null, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot press keys on restricted page', restricted: true };
  }

  const { ok, result, error, restricted } = await safeExecuteScript(
    tab.id,
    (keyName, sel) => {
      let target = document.activeElement || document.body;
      if (sel) {
        const element = document.querySelector(sel);
        if (element) {
          element.focus();
          target = element;
        }
      }

      const keyMap = {
        'Enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
        'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
        'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
        'Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
        'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
        'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
        'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
        'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
      };

      const keyInfo = keyMap[keyName] || { key: keyName, code: keyName, keyCode: 0 };

      const eventOptions = {
        key: keyInfo.key,
        code: keyInfo.code,
        keyCode: keyInfo.keyCode,
        which: keyInfo.keyCode,
        bubbles: true,
        cancelable: true,
      };

      target.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
      target.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
      target.dispatchEvent(new KeyboardEvent('keyup', eventOptions));

      return { success: true, key: keyName, target: target.tagName };
    },
    [key, selector]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

// Execute JavaScript code
export async function executeScript(code, tabId, sessionId) {
  const tab = await getTargetTab(tabId, sessionId);

  if (isRestrictedUrl(tab.url)) {
    return { success: false, error: 'Cannot execute script on restricted page', restricted: true };
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (c) => {
      try {
        return { success: true, result: eval(c) };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    args: [code],
  });
  return results[0].result;
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
    [text, selector]
  );

  if (!ok) return { success: false, error, restricted };
  return result;
}

