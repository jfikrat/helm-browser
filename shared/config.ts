// Helm MCP - Shared Configuration

import { homedir } from "os";
import { join } from "path";

// WebSocket server port
export const WS_PORT = parseInt(process.env.BROWSER_MCP_PORT || "9876", 10);

// Protocol version for compatibility checks
export const PROTOCOL_VERSION = 3;

// Timeouts
export const REQUEST_TIMEOUT_MS = 30000;
export const EXTENSION_CONNECT_TIMEOUT_MS = 15000;
export const CLIENT_KEEPALIVE_INTERVAL_MS = 30000;
export const CLIENT_KEEPALIVE_TIMEOUT_MS = 60000;

// Screenshot settings
export const MAX_SCREENSHOT_DIMENSION = 1310;

// Chrome paths (Linux)
export const CHROME_PATHS = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/google/chrome/chrome",
];

// PID file for systemd (optional, for status checks)
export const PID_FILE = join(
  homedir(),
  ".claude",
  "mcp",
  "helm",
  ".daemon.pid"
);

// Log file (if running as systemd service, logs go to journald instead)
export const LOG_FILE = join(
  homedir(),
  ".claude",
  "mcp",
  "helm",
  "daemon.log"
);
