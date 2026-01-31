// Helm MCP - Lock File Management

import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { WS_PORT, PROTOCOL_VERSION, LOCK_FILE } from "./config.js";

// Check if a process with given PID is running
export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0 = check existence without killing
    return true;
  } catch {
    return false;
  }
}

// Write lock file to indicate server is running
export function writeLockFile(): void {
  try {
    writeFileSync(
      LOCK_FILE,
      JSON.stringify({
        pid: process.pid,
        port: WS_PORT,
        startedAt: Date.now(),
      })
    );
  } catch (error) {
    console.error("[MCP] Failed to write lock file:", error);
  }
}

// Remove lock file on shutdown
export function removeLockFile(): void {
  try {
    if (existsSync(LOCK_FILE)) {
      unlinkSync(LOCK_FILE);
    }
  } catch (error) {
    console.error("[MCP] Failed to remove lock file:", error);
  }
}

// Check if another server is already running
export async function checkExistingServer(): Promise<boolean> {
  // First check if stale lock file exists
  if (existsSync(LOCK_FILE)) {
    try {
      const data = JSON.parse(readFileSync(LOCK_FILE, "utf-8")) as { pid: number };
      if (!isProcessRunning(data.pid)) {
        console.error("[MCP] Stale lock file detected, removing...");
        unlinkSync(LOCK_FILE);
        return false;
      }
    } catch {
      // Lock file corrupted, remove it
      console.error("[MCP] Corrupted lock file, removing...");
      unlinkSync(LOCK_FILE);
      return false;
    }
  }

  // Then verify via HTTP that server is actually responding
  try {
    const response = await fetch(`http://localhost:${WS_PORT}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data = (await response.json()) as {
        status: string;
        protocolVersion: number;
      };
      return data.status === "ok" && data.protocolVersion === PROTOCOL_VERSION;
    }
  } catch {
    // Server not running or not responding
  }
  return false;
}
