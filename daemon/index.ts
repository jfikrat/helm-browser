#!/usr/bin/env bun
// Helm MCP Daemon - Main Entry Point
// Runs as systemd user service, manages browser control for all MCP clients

import { writeFileSync, unlinkSync, existsSync } from "fs";
import { PID_FILE, WS_PORT } from "../shared/config.js";
import { startServer, stopServer } from "./server.js";
import { chromeProcess } from "./state.js";

// Write PID file for status checks
function writePidFile(): void {
  try {
    writeFileSync(PID_FILE, JSON.stringify({
      pid: process.pid,
      port: WS_PORT,
      startedAt: Date.now(),
    }));
  } catch (error) {
    console.error("[Daemon] Failed to write PID file:", error);
  }
}

// Remove PID file on shutdown
function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch (error) {
    console.error("[Daemon] Failed to remove PID file:", error);
  }
}

// Graceful shutdown
function shutdown(): void {
  console.error("[Daemon] Shutting down...");

  stopServer();

  // Kill Chrome if we started it
  if (chromeProcess) {
    console.error("[Daemon] Killing Chrome process...");
    try {
      chromeProcess.kill();
    } catch (e) {
      // Ignore
    }
  }

  removePidFile();
  console.error("[Daemon] Shutdown complete");
  process.exit(0);
}

// Signal handlers
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Uncaught exception handler
process.on("uncaughtException", (error) => {
  console.error("[Daemon] Uncaught exception:", error);
  shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Daemon] Unhandled rejection at:", promise, "reason:", reason);
});

// Main entry point
async function main(): Promise<void> {
  console.error(`[Daemon] Helm MCP Daemon starting...`);
  console.error(`[Daemon] PID: ${process.pid}`);
  console.error(`[Daemon] Port: ${WS_PORT}`);

  // Check if another daemon is already running
  if (existsSync(PID_FILE)) {
    try {
      const data = JSON.parse(
        await Bun.file(PID_FILE).text()
      ) as { pid: number; port: number };

      // Check if process is still running
      try {
        process.kill(data.pid, 0);
        console.error(`[Daemon] Another daemon is already running (PID: ${data.pid})`);
        process.exit(1);
      } catch {
        // Process not running, remove stale PID file
        console.error("[Daemon] Removing stale PID file...");
        removePidFile();
      }
    } catch {
      // Invalid PID file, remove it
      removePidFile();
    }
  }

  writePidFile();

  try {
    await startServer();
    console.error("[Daemon] Ready and waiting for connections");
  } catch (error) {
    console.error("[Daemon] Failed to start server:", error);
    removePidFile();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[Daemon] Fatal error:", error);
  removePidFile();
  process.exit(1);
});
