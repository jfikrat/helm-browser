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
  {
    name: "browser_record",
    description: "Record browser tab as video while executing JavaScript code. Uses Chrome Debugger API. Returns video file path after execution completes.",
    inputSchema: {
      type: "object",
      properties: {
        execute: { type: "string", description: "JavaScript code to execute during recording. Supports async/await." },
        duration: { type: "string", enum: ["5s", "10s", "15s"], description: "Max recording duration (default: 10s)" },
        tabId: { type: "number", description: "Optional: specific tab to record" },
      },
      required: ["execute"],
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
  browser_record: "record_start",
  browser_execute: "execute",
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

    // Screenshot handler
    if (name === "browser_screenshot") {
      const command = "screenshot";
      const selector = typedArgs.selector as string | undefined;
      const result = (await sendCommand(command, {
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
        execute: typedArgs.execute,
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
