// Helm MCP - Configuration

import { homedir } from "os";
import { join } from "path";

export const WS_PORT = parseInt(process.env.BROWSER_MCP_PORT || "9876", 10);
export const MAX_SCREENSHOT_DIMENSION = 1310; // Optimal for Claude vision coordinate prediction
export const PROTOCOL_VERSION = 3;
export const REQUEST_TIMEOUT_MS = 30000;
export const EXTENSION_CONNECT_TIMEOUT_MS = 15000;

export const CHROME_PATHS = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/google/chrome/chrome",
];

export const LOCK_FILE = join(
  homedir(),
  ".claude",
  "mcp",
  "helm",
  ".server.lock"
);

// Proxy reconnection settings
export const PROXY_MAX_RETRIES = 5;
export const PROXY_INITIAL_DELAY_MS = 2000;

// Keepalive settings
export const PROXY_KEEPALIVE_INTERVAL_MS = 30000;
