// Helm MCP Daemon - Chrome Auto-Start

import { existsSync } from "fs";
import { CHROME_PATHS, EXTENSION_CONNECT_TIMEOUT_MS } from "../shared/config.js";
import { chromeProcess, setChromeProcess, extensionConnection } from "./state.js";

declare const Bun: {
  spawn(
    cmd: string[],
    options?: { stdout?: string; stderr?: string }
  ): {
    pid: number;
    kill: () => void;
  };
};

// Find Chrome executable
export function findChrome(): string | null {
  for (const path of CHROME_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

// Start Chrome browser
export async function startChrome(): Promise<boolean> {
  if (chromeProcess) {
    return true; // Already running
  }

  const chromePath = findChrome();
  if (!chromePath) {
    console.error("[Daemon] Chrome not found in standard paths");
    return false;
  }

  console.error(`[Daemon] Starting Chrome: ${chromePath}`);

  try {
    const proc = Bun.spawn([chromePath], {
      stdout: "ignore",
      stderr: "ignore",
    });
    setChromeProcess(proc);
    console.error(`[Daemon] Chrome started with PID: ${proc.pid}`);
    return true;
  } catch (error) {
    console.error("[Daemon] Failed to start Chrome:", error);
    return false;
  }
}

// Ensure extension is connected (auto-start Chrome if needed)
export async function ensureExtensionConnected(
  timeoutMs = EXTENSION_CONNECT_TIMEOUT_MS
): Promise<boolean> {
  if (extensionConnection) {
    return true;
  }

  // Try to start Chrome
  const chromeStarted = await startChrome();
  if (!chromeStarted) {
    return false;
  }

  // Wait for extension to connect
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (extensionConnection) {
      console.error("[Daemon] Extension connected after Chrome start");
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.error("[Daemon] Extension did not connect within timeout");
  return false;
}
