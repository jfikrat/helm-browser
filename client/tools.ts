// Helm MCP Client - Tool Definitions & Handlers

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import sharp from "sharp";
import { writeFile, mkdir, rm } from "fs/promises";
import { execSync } from "child_process";

import { WS_PORT, PROTOCOL_VERSION } from "../shared/config.js";
import { mySessionId, daemonWs, isRegistered } from "./state.js";
import { sendCommand } from "./connection.js";

const SCREENSHOT_DEBUG_PATH = "/tmp/browser-screenshot-latest.jpg";

// Tool definitions
export const tools: Tool[] = [
  {
    name: "browser_navigate",
    description: "Navigate the browser to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to" },
        tabId: { type: "number", description: "Optional: specific tab to navigate" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_back",
    description: "Go back in browser history",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Optional timeout while waiting for the URL to change (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_forward",
    description: "Go forward in browser history",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Optional timeout while waiting for the URL to change (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_reload",
    description: "Reload the current tab",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page or a specific element. Prefer text-based reads first; use only when visual verification or layout matters.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Optional: specific tab to capture" },
        selector: { type: "string", description: "Optional: CSS selector to capture specific element" },
        fullPage: { type: "boolean", description: "Capture the entire scrollable page, not just the viewport (max height 16384px)" },
      },
    },
  },
  {
    name: "browser_emulate_device",
    description: 'Set mobile viewport and device emulation. Accepts a preset name (e.g. "iPhone 15", "Pixel 8", "iPad Pro") or a custom config object.',
    inputSchema: {
      type: "object",
      properties: {
        device: {
          description: 'Device preset name ("iPhone 15", "iPhone 15 Pro Max", "Pixel 8", "iPad Pro", "Galaxy S24") or custom object { width, height, deviceScaleFactor, mobile, userAgent, touch }',
          oneOf: [
            { type: "string" },
            {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" },
                deviceScaleFactor: { type: "number" },
                mobile: { type: "boolean" },
                userAgent: { type: "string" },
                touch: { type: "boolean" },
              },
            },
          ],
        },
        tabId: { type: "number", description: "Optional: specific tab" },
        sessionId: { type: "string", description: "Optional: specific session" },
      },
      required: ["device"],
    },
  },
  {
    name: "browser_reset_viewport",
    description: "Clear all device emulation and restore the real browser viewport.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Optional: specific tab" },
        sessionId: { type: "string", description: "Optional: specific session" },
      },
    },
  },
  {
    name: "browser_get_element_text",
    description: "Get text content of a specific element (bypasses CSP, much smaller than full page). Lightweight read; prefer this for extracting specific content.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        index: { type: "number", description: "Element index: null=first, -1=last, 0+=specific index" },
        visibleOnly: { type: "boolean", description: "Ignore hidden matches and return the first visible element (default true)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_content",
    description: "Get the current page title, URL, HTML, and visible text content. Heavy read because it includes full HTML; use lighter tools first when possible.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_interactables",
    description: "List visible interactive elements on the page with text and bounds. Lightweight target list; prefer this over full snapshot when you only need clickable or typeable elements.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of interactable elements to return (default 100, max 200)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_semantic_snapshot",
    description: "Get a semantic summary of the page including landmarks, headings, forms, and key interactive elements. Compact summary that is lighter than a full interactive snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum items to include per section (default 20, max 50)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_console_logs",
    description: "Collect console logs and page exceptions for a short duration. Optionally reload the page first.",
    inputSchema: {
      type: "object",
      properties: {
        duration: { type: "number", description: "Collection duration in milliseconds (default 1000, max 10000)" },
        reload: { type: "boolean", description: "Reload the page before collecting logs" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_network_requests",
    description: "Collect network requests for a short duration. Optionally reload the page first.",
    inputSchema: {
      type: "object",
      properties: {
        duration: { type: "number", description: "Collection duration in milliseconds (default 1000, max 10000)" },
        reload: { type: "boolean", description: "Reload the page before collecting requests" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_url",
    description: "Get the current page URL and title",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_get_tabs",
    description: "Get list of all open browser tabs",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_switch_tab",
    description: "Switch to a specific tab by ID",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "The tab ID to switch to" },
      },
      required: ["tabId"],
    },
  },
  {
    name: "browser_new_tab",
    description: "Open a new browser tab",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to open (optional)" },
      },
    },
  },
  {
    name: "browser_close_tab",
    description: "Close a browser tab",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Tab ID to close (optional)" },
      },
    },
  },
  {
    name: "browser_click",
    description: "Click an element on the page using CSS selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        verify: { type: "boolean", description: "Optional: verify that the click changed page state" },
        verifyTimeout: { type: "number", description: "Optional: verification wait in milliseconds" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_click_and_wait",
    description: "Click an element on the page, then wait for a URL change, selector, network idle, or JavaScript function result",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        waitFor: {
          type: "object",
          description: "Wait condition after the click",
          properties: {
            type: { type: "string", enum: ["url", "selector", "networkIdle", "function"] },
            value: { type: "string", description: "URL fragment, selector, or JavaScript expression depending on wait type" },
            match: { type: "string", enum: ["includes", "equals", "startsWith"], description: "URL match mode when waitFor.type is url" },
            timeout: { type: "number", description: "Optional timeout for network idle waits in milliseconds" },
          },
          required: ["type"],
        },
        timeout: { type: "number", description: "Optional timeout in milliseconds for the wait condition" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["selector", "waitFor"],
    },
  },
  {
    name: "browser_right_click",
    description: "Right-click an element on the page using CSS selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_double_click",
    description: "Double-click an element on the page using CSS selector",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_type",
    description: "Type text into an input element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the input" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        text: { type: "string", description: "Text to type" },
        verify: { type: "boolean", description: "Optional: verify that the typed text appears in the target element" },
        verifyTimeout: { type: "number", description: "Optional: verification wait in milliseconds" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_type_and_wait",
    description: "Type text into an input element, then wait for a URL change, selector, network idle, or JavaScript function result",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the input" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        text: { type: "string", description: "Text to type" },
        waitFor: {
          type: "object",
          description: "Wait condition after typing",
          properties: {
            type: { type: "string", enum: ["url", "selector", "networkIdle", "function"] },
            value: { type: "string", description: "URL fragment, selector, or JavaScript expression depending on wait type" },
            match: { type: "string", enum: ["includes", "equals", "startsWith"], description: "URL match mode when waitFor.type is url" },
            timeout: { type: "number", description: "Optional timeout for network idle waits in milliseconds" },
          },
          required: ["type"],
        },
        timeout: { type: "number", description: "Optional timeout in milliseconds for the wait condition" },
        verify: { type: "boolean", description: "Optional: verify that the typed text appears in the target element" },
        verifyTimeout: { type: "number", description: "Optional: verification wait in milliseconds" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["text", "selector", "waitFor"],
    },
  },
  {
    name: "browser_hover",
    description: "Hover over an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the page or an element",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["up", "down", "left", "right"] },
        amount: { type: "number", description: "Scroll amount in pixels (default 500)" },
        selector: { type: "string", description: "Optional: element to scroll" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["direction"],
    },
  },
  {
    name: "browser_click_at",
    description: "Click at specific X,Y coordinates. Use verify=true to check if click had any effect.",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
        tabId: { type: "number", description: "Optional: specific tab" },
        verify: { type: "boolean", description: "Check click effect (default: false)" },
        verifyTimeout: { type: "number", description: "Ms to wait for effects (default: 150, max: 1000)" },
      },
      required: ["x", "y"],
    },
  },
  {
    name: "browser_find_text",
    description: "Find text on the page and get its coordinates",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to find" },
        click: { type: "boolean", description: "Click on first match" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_press_key",
    description: "Press a keyboard key (Enter, Tab, Escape, ArrowUp, ArrowDown, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key to press: Enter, Tab, Escape, Backspace, ArrowUp, ArrowDown, ArrowLeft, ArrowRight" },
        selector: { type: "string", description: "Optional: CSS selector to focus before pressing key" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        verify: { type: "boolean", description: "Optional: verify that the key press changed page state" },
        verifyTimeout: { type: "number", description: "Optional: verification wait in milliseconds" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["key"],
    },
  },
  {
    name: "browser_press_keys",
    description: "Press a key chord such as Control+A or Shift+Tab",
    inputSchema: {
      type: "object",
      properties: {
        keys: {
          type: "array",
          items: { type: "string" },
          description: "Ordered key chord, e.g. [\"Control\", \"a\"] or [\"Shift\", \"Tab\"]",
        },
        selector: { type: "string", description: "Optional: CSS selector to focus before pressing keys" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["keys"],
    },
  },
  {
    name: "browser_submit_and_wait",
    description: "Submit a form or focused element, then wait for a URL change, selector, network idle, or JavaScript function result",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "Optional: CSS selector for the form or submit control" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        waitFor: {
          type: "object",
          description: "Wait condition after the submit",
          properties: {
            type: { type: "string", enum: ["url", "selector", "networkIdle", "function"] },
            value: { type: "string", description: "URL fragment, selector, or JavaScript expression depending on wait type" },
            match: { type: "string", enum: ["includes", "equals", "startsWith"], description: "URL match mode when waitFor.type is url" },
            timeout: { type: "number", description: "Optional timeout for network idle waits in milliseconds" },
          },
          required: ["type"],
        },
        timeout: { type: "number", description: "Optional timeout in milliseconds for the wait condition" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["waitFor"],
    },
  },
  {
    name: "browser_sequence",
    description: "Run up to 25 browser steps inside one extension-native sequence to reduce round-trips",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          description: "Ordered browser steps to run. Maximum 25 steps.",
          maxItems: 25,
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["click", "type", "submit", "pressKey", "select", "wait", "getUrl", "getElementText"],
              },
              selector: { type: "string", description: "Optional CSS selector for the step target" },
              locator: { type: "object", description: "Optional semantic locator for the step target" },
              text: { type: "string", description: "Text to type for type steps" },
              key: { type: "string", description: "Key name for pressKey steps" },
              value: { type: "string", description: "Option value or visible text for select steps" },
              index: { type: "number", description: "Optional element index for getElementText steps" },
              verify: { type: "boolean", description: "Optional verification flag for click/type/pressKey steps" },
              verifyTimeout: { type: "number", description: "Optional verification timeout for click/type/pressKey steps" },
              timeout: { type: "number", description: "Optional timeout override for wait steps" },
              waitFor: {
                type: "object",
                description: "Wait condition for wait steps",
                properties: {
                  type: { type: "string", enum: ["url", "selector", "networkIdle", "function"] },
                  value: { type: "string", description: "URL fragment, selector, or JavaScript expression depending on wait type" },
                  match: { type: "string", enum: ["includes", "equals", "startsWith"], description: "URL match mode when waitFor.type is url" },
                  timeout: { type: "number", description: "Idle timeout for networkIdle waits in milliseconds" },
                },
                required: ["type"],
              },
            },
            required: ["type"],
          },
        },
        tabId: { type: "number", description: "Optional: specific tab" },
        stopOnError: { type: "boolean", description: "Stop on first failed step (default true)" },
        defaultTimeout: { type: "number", description: "Default timeout in milliseconds for wait steps (default 10000)" },
      },
      required: ["steps"],
    },
  },
  {
    name: "browser_select",
    description: "Select an option in a dropdown by value or visible text",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the select element" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        value: { type: "string", description: "Option value attribute or visible text" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["value"],
    },
  },
  {
    name: "browser_get_snapshot",
    description: "Get all interactive elements on the page with stable refs. Full interactive map; for follow-up reads prefer incremental=true with sinceVersion to reduce token cost.",
    inputSchema: {
      type: "object",
      properties: {
        incremental: { type: "boolean", description: "Return only changes since a prior snapshot version when possible" },
        sinceVersion: { type: "number", description: "Previous snapshot version to diff against when incremental is true" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_list_targets",
    description: "List all tabs, windows, and iframes in the current session",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Optional: specific session to inspect" },
      },
    },
  },
  {
    name: "browser_wait_for_popup",
    description: "Wait for a new tab or popup window to open",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Timeout in milliseconds (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab to watch for popup-related opens" },
      },
    },
  },
  {
    name: "browser_wait_for_dialog",
    description: "Wait for a JavaScript dialog (alert/confirm/prompt) to appear",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Timeout in milliseconds (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab to watch" },
      },
    },
  },
  {
    name: "browser_handle_dialog",
    description: "Accept or dismiss a JavaScript dialog (alert/confirm/prompt)",
    inputSchema: {
      type: "object",
      properties: {
        accept: { type: "boolean", description: "Accept the dialog (default true)" },
        promptText: { type: "string", description: "Text to submit for prompt dialogs" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_drag_and_drop",
    description: "Drag one element onto another using a synthetic HTML5 drag-and-drop sequence",
    inputSchema: {
      type: "object",
      properties: {
        sourceSelector: { type: "string", description: "CSS selector for the draggable source element" },
        targetSelector: { type: "string", description: "CSS selector for the drop target element" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["sourceSelector", "targetSelector"],
    },
  },
  {
    name: "browser_upload_file",
    description: "Set one or more local files on an <input type=file> element using absolute file paths",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the file input element" },
        path: { type: "string", description: "Absolute path to a single local file" },
        paths: {
          type: "array",
          description: "Absolute paths to multiple local files",
          items: { type: "string" },
        },
        verify: { type: "boolean", description: "Optional: verify that the file input now contains the selected files" },
        verifyTimeout: { type: "number", description: "Optional: verification wait in milliseconds" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["selector"],
      anyOf: [
        { required: ["path"] },
        { required: ["paths"] },
      ],
    },
  },
  {
    name: "browser_wait_for_download",
    description: "Wait for a browser download to start and complete",
    inputSchema: {
      type: "object",
      properties: {
        timeout: { type: "number", description: "Timeout in milliseconds (default 15000)" },
        filenameContains: { type: "string", description: "Optional substring filter for the downloaded filename" },
      },
    },
  },
  {
    name: "browser_download_url",
    description: "Download a URL directly via the Chrome downloads API, bypassing page clicks when possible",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The file URL to download" },
        filename: { type: "string", description: "Optional target filename relative to the browser Downloads folder" },
        saveAs: { type: "boolean", description: "Whether to show the Save As dialog (default false)" },
        wait: { type: "boolean", description: "Wait for the download to complete before returning (default true)" },
        timeout: { type: "number", description: "Timeout in milliseconds when wait=true (default 15000)" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_wait",
    description: "Wait for an element to appear on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to wait for" },
        locator: { type: "object", description: "Semantic locator (alternative to selector). Properties: role, name, text, label, placeholder, testId, ref" },
        timeout: { type: "number", description: "Timeout in milliseconds (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_wait_for_url",
    description: "Wait for the current tab URL to match a value",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL fragment, exact URL, or regex pattern to wait for" },
        match: { type: "string", enum: ["includes", "equals", "regex"], description: "How to compare URLs (default: includes)" },
        timeout: { type: "number", description: "Timeout in milliseconds (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_wait_for_text",
    description: "Wait for visible page text to contain a string",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to wait for" },
        timeout: { type: "number", description: "Timeout in milliseconds (default 10000)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_wait_for_request",
    description: "Wait for a network request matching a URL filter, with optional method and status filters",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL fragment, exact URL, or regex pattern to wait for" },
        match: { type: "string", enum: ["includes", "equals", "regex"], description: "How to compare URLs (default: includes)" },
        method: { type: "string", description: "Optional HTTP method filter (GET, POST, etc.)" },
        status: { type: "number", description: "Optional expected response status code" },
        timeout: { type: "number", description: "Timeout in milliseconds (default 15000)" },
        reload: { type: "boolean", description: "Reload the page before waiting" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_wait_for_network_idle",
    description: "Wait until the page has no in-flight network requests for a given idle period",
    inputSchema: {
      type: "object",
      properties: {
        idleTime: { type: "number", description: "Required quiet period in milliseconds (default 1000)" },
        timeout: { type: "number", description: "Timeout in milliseconds (default 15000)" },
        reload: { type: "boolean", description: "Reload the page before waiting" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
    },
  },
  {
    name: "browser_status",
    description: "Check browser extension connection status",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_debug_status",
    description: "Get internal debugger session state, active observers, and recordings for debugging",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_paste",
    description: "Paste text into the focused element or a specific element. Useful for long texts or when browser_type doesn't work.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to paste" },
        selector: { type: "string", description: "Optional: CSS selector for the target element" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_record",
    description: "Record browser tab as video. Optionally execute JavaScript code during recording. Uses Chrome Debugger API and returns a video file path after capture completes.",
    inputSchema: {
      type: "object",
      properties: {
        execute: { type: "string", description: "Optional JavaScript code to execute during recording. Supports async/await." },
        duration: { type: "string", enum: ["5s", "10s", "15s"], description: "Max recording duration (default: 10s)" },
        tabId: { type: "number", description: "Optional: specific tab to record" },
      },
    },
  },
  {
    name: "browser_execute",
    description: "Execute JavaScript code in the browser tab. Returns the result of the expression. Useful for frontend testing, DOM manipulation, or extracting data.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to execute" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["code"],
    },
  },
  {
    name: "browser_wait_for_function",
    description: "Wait until a JavaScript expression returns truthy (polls at interval)",
    inputSchema: {
      type: "object",
      properties: {
        expression: { type: "string", description: "JavaScript expression to evaluate" },
        timeout: { type: "number", description: "Max wait time in ms (default 10000, max 60000)" },
        interval: { type: "number", description: "Poll interval in ms (default 200)" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["expression"],
    },
  },
  {
    name: "browser_get_cookies",
    description: "Get cookies for a URL (includes HttpOnly cookies via chrome.cookies API)",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to get cookies for (e.g. https://grok.com)" },
        name: { type: "string", description: "Optional: specific cookie name to filter" },
      },
    },
  },
  {
    name: "browser_set_cookie",
    description: "Set a cookie for a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to scope the cookie to" },
        name: { type: "string", description: "Cookie name" },
        value: { type: "string", description: "Cookie value" },
        domain: { type: "string", description: "Optional cookie domain" },
        path: { type: "string", description: "Optional cookie path" },
        secure: { type: "boolean", description: "Optional secure flag" },
        httpOnly: { type: "boolean", description: "Optional HttpOnly flag" },
        expirationDate: { type: "number", description: "Optional expiration time as seconds since epoch" },
        sameSite: { type: "string", description: "Optional SameSite value" },
      },
      required: ["url", "name", "value"],
    },
  },
  {
    name: "browser_clear_cookies",
    description: "Clear one cookie by name or all cookies for a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to clear cookies for" },
        name: { type: "string", description: "Optional cookie name to remove a single cookie" },
      },
    },
  },
];

// Tool name to command mapping
const toolToCommand: Record<string, string> = {
  browser_navigate: "navigate",
  browser_back: "back",
  browser_forward: "forward",
  browser_reload: "reload",
  browser_emulate_device: "emulate_device",
  browser_reset_viewport: "reset_viewport",
  browser_get_content: "get_content",
  browser_get_interactables: "get_interactables",
  browser_get_semantic_snapshot: "get_semantic_snapshot",
  browser_get_console_logs: "get_console_logs",
  browser_get_network_requests: "get_network_requests",
  browser_get_element_text: "get_element_text",
  browser_get_url: "get_url",
  browser_get_tabs: "get_tabs",
  browser_switch_tab: "switch_tab",
  browser_new_tab: "new_tab",
  browser_close_tab: "close_tab",
  browser_click: "click",
  browser_click_and_wait: "click_and_wait",
  browser_right_click: "right_click",
  browser_double_click: "double_click",
  browser_type: "type",
  browser_type_and_wait: "type_and_wait",
  browser_hover: "hover",
  browser_scroll: "scroll",
  browser_click_at: "click_at",
  browser_find_text: "find_text",
  browser_press_key: "press_key",
  browser_press_keys: "press_keys",
  browser_select: "select",
  browser_sequence: "sequence",
  browser_submit_and_wait: "submit_and_wait",
  browser_wait_for_function: "wait_for_function",
  browser_list_targets: "list_targets",
  browser_wait_for_popup: "wait_for_popup",
  browser_wait_for_dialog: "wait_for_dialog",
  browser_handle_dialog: "handle_dialog",
  browser_drag_and_drop: "drag_and_drop",
  browser_upload_file: "upload_file",
  browser_wait_for_download: "wait_for_download",
  browser_download_url: "download_url",
  browser_wait: "wait",
  browser_wait_for_url: "wait_for_url",
  browser_wait_for_text: "wait_for_text",
  browser_wait_for_request: "wait_for_request",
  browser_wait_for_network_idle: "wait_for_network_idle",
  browser_debug_status: "debug_status",
  browser_get_snapshot: "get_snapshot",
  browser_paste: "paste",
  browser_record: "record_start",
  browser_execute: "execute",
  browser_get_cookies: "get_cookies",
  browser_set_cookie: "set_cookie",
  browser_clear_cookies: "clear_cookies",
};

// Handle tool calls
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>; isError?: boolean }> {
  const typedArgs = args || {};
  const tabId = typedArgs.tabId as number | undefined;

  try {
    // Status handler
    if (name === "browser_status") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                mode: "client",
                connected: daemonWs?.readyState === WebSocket.OPEN,
                registered: isRegistered,
                wsPort: WS_PORT,
                protocolVersion: PROTOCOL_VERSION,
                mySessionId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Connection check
    if (!daemonWs || daemonWs.readyState !== WebSocket.OPEN) {
      return {
        content: [{ type: "text", text: "Not connected to daemon" }],
        isError: true,
      };
    }

    if (!isRegistered) {
      return {
        content: [{ type: "text", text: "Session not registered with daemon" }],
        isError: true,
      };
    }

    if (name === "browser_debug_status") {
      const result = await sendCommand("debug_status", {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    if (name === "browser_list_targets") {
      const sessionId = (typedArgs.sessionId as string | undefined) || mySessionId || "";
      const result = await sendCommand("list_targets", { sessionId });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    if (name === "browser_wait_for_popup" || name === "browser_wait_for_dialog" || name === "browser_handle_dialog") {
      const command = toolToCommand[name];
      const result = await sendCommand(command, {
        ...typedArgs,
        sessionId: mySessionId || "",
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // Screenshot handler
    if (name === "browser_screenshot") {
      const command = "screenshot";
      const selector = typedArgs.selector as string | undefined;
      const fullPage = typedArgs.fullPage as boolean | undefined;
      const result = (await sendCommand(command, {
        tabId,
        selector,
        fullPage,
      })) as { image: string; error?: string };

      if (result?.error && !result?.image) {
        return { content: [{ type: "text", text: result.error }], isError: true };
      }

      if (result?.image) {
        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Get dimensions
        const meta = await sharp(buffer).metadata();

        // JPG format for Claude vision
        const jpegBuffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();

        // Save to debug file
        await writeFile(SCREENSHOT_DEBUG_PATH, jpegBuffer);

        return {
          content: [
            {
              type: "text",
              text: `Screenshot: ${meta.width}x${meta.height} saved to ${SCREENSHOT_DEBUG_PATH}`,
            },
            {
              type: "image",
              data: jpegBuffer.toString("base64"),
              mimeType: "image/jpeg",
            },
          ],
        };
      }
      return { content: [{ type: "text", text: "Screenshot failed" }], isError: true };
    }

    // Record - runs execute code and returns video
    if (name === "browser_record") {
      // Convert duration string to ms (default: 10s)
      const durationMap: Record<string, number> = { "5s": 5000, "10s": 10000, "15s": 15000 };
      const maxDuration = durationMap[typedArgs.duration as string] || 10000;

      const result = (await sendCommand("record_start", {
        tabId,
        maxDuration,
        execute: typedArgs.execute ?? null,
      })) as {
        success: boolean;
        error?: string;
        mode?: string;
        frames?: Array<{ data: string; timestamp: number }>;
        frameCount?: number;
        duration?: number;
        fps?: number;
        executeResult?: unknown;
        executeError?: string;
      };

      if (!result?.success) {
        return {
          content: [{ type: "text", text: result?.error || "Recording failed" }],
          isError: true,
        };
      }

      const frames = result.frames || [];
      if (frames.length === 0) {
        return {
          content: [{ type: "text", text: "No frames captured" }],
          isError: true,
        };
      }

      // Convert frames to video using ffmpeg
      const timestamp = Date.now();
      const tempDir = `/tmp/helm-recording-${timestamp}`;
      const outputPath = `/tmp/helm-recording-${timestamp}.webm`;

      try {
        await mkdir(tempDir, { recursive: true });

        // Write frames as numbered JPEGs
        for (let i = 0; i < frames.length; i++) {
          const frameBuffer = Buffer.from(frames[i].data, "base64");
          const framePath = `${tempDir}/frame_${String(i).padStart(5, "0")}.jpg`;
          await writeFile(framePath, frameBuffer);
        }

        // Calculate FPS from actual frame timing
        const fps = result.fps && result.fps > 0 ? result.fps : 10;

        // Run ffmpeg to create video
        execSync(
          `ffmpeg -y -framerate ${fps} -i "${tempDir}/frame_%05d.jpg" -c:v libvpx-vp9 -b:v 1M -pix_fmt yuv420p "${outputPath}" 2>/dev/null`,
          { timeout: 30000 }
        );

        // Clean up temp directory
        await rm(tempDir, { recursive: true, force: true });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  mode: "execute",
                  videoPath: outputPath,
                  frameCount: frames.length,
                  duration: result.duration,
                  fps,
                  executeResult: result.executeResult,
                  executeError: result.executeError,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (ffmpegError) {
        // Clean up on error
        try {
          await rm(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
        return {
          content: [
            {
              type: "text",
              text: `FFmpeg error: ${ffmpegError instanceof Error ? ffmpegError.message : String(ffmpegError)}. Make sure ffmpeg is installed.`,
            },
          ],
          isError: true,
        };
      }
    }

    // Generic command handler
    const command = toolToCommand[name];
    if (!command) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const result = await sendCommand(command, typedArgs);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
