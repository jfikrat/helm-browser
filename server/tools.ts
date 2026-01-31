// Helm MCP - Tool Definitions & Handlers

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import sharp from "sharp";
import { writeFile } from "fs/promises";

const SCREENSHOT_DEBUG_PATH = "/tmp/browser-screenshot-latest.jpg";
import { MAX_SCREENSHOT_DIMENSION, WS_PORT, PROTOCOL_VERSION } from "./config.js";
import {
  mySessionId,
  extensionConnection,
  isProxyMode,
  proxyWs,
} from "./state.js";
import { sendCommand } from "./commands.js";
import { ensureExtensionConnected } from "./chrome.js";
import { ensureSessionWindow } from "./session.js";

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
    name: "browser_screenshot",
    description: "Take a screenshot of the current page or a specific element",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "Optional: specific tab to capture" },
        selector: { type: "string", description: "Optional: CSS selector to capture specific element" },
      },
    },
  },
  {
    name: "browser_get_element_text",
    description: "Get text content of a specific element (bypasses CSP, much smaller than full page)",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        index: { type: "number", description: "Element index: null=first, -1=last, 0+=specific index" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["selector"],
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
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_type",
    description: "Type text into an input element",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the input" },
        text: { type: "string", description: "Text to type" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "browser_hover",
    description: "Hover over an element on the page",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector for the element" },
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["selector"],
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
        tabId: { type: "number", description: "Optional: specific tab" },
      },
      required: ["key"],
    },
  },
  {
    name: "browser_status",
    description: "Check browser extension connection status",
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
];

// Tool name to command mapping
const toolToCommand: Record<string, string> = {
  browser_navigate: "navigate",
  browser_get_element_text: "get_element_text",
  browser_get_url: "get_url",
  browser_get_tabs: "get_tabs",
  browser_switch_tab: "switch_tab",
  browser_new_tab: "new_tab",
  browser_close_tab: "close_tab",
  browser_click: "click",
  browser_type: "type",
  browser_hover: "hover",
  browser_scroll: "scroll",
  browser_click_at: "click_at",
  browser_find_text: "find_text",
  browser_press_key: "press_key",
  browser_paste: "paste",
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
                mode: isProxyMode ? "proxy" : "server",
                connected: isProxyMode
                  ? proxyWs?.readyState === WebSocket.OPEN
                  : extensionConnection !== null,
                wsPort: WS_PORT,
                protocolVersion: PROTOCOL_VERSION,
                mySessionId,
                totalSessions: 1,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Connection check for other commands
    if (isProxyMode) {
      if (!proxyWs || proxyWs.readyState !== WebSocket.OPEN) {
        return {
          content: [{ type: "text", text: "Proxy not connected to main server" }],
          isError: true,
        };
      }
    } else {
      if (!extensionConnection) {
        const connected = await ensureExtensionConnected();
        if (!connected) {
          return {
            content: [
              { type: "text", text: "Extension not connected and Chrome failed to start" },
            ],
            isError: true,
          };
        }
      }

      // Ensure session has a window (lazy initialization)
      if (mySessionId) {
        await ensureSessionWindow(mySessionId);
      }
    }

    // Screenshot handler
    if (name === "browser_screenshot") {
      const command = "screenshot";
      const selector = typedArgs.selector as string | undefined;
      const result = (await sendCommand(mySessionId || "", command, {
        tabId,
        selector,
      })) as { image: string; error?: string };

      if (result?.error && !result?.image) {
        return { content: [{ type: "text", text: result.error }], isError: true };
      }

      if (result?.image) {
        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Get dimensions
        const meta = await sharp(buffer).metadata();

        // JPG format for AI vision - no resize needed (physical = 1310x~800)
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

    // Generic command handler
    const command = toolToCommand[name];
    if (!command) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const result = await sendCommand(mySessionId || "", command, typedArgs);
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
