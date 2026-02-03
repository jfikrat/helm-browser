#!/usr/bin/env bun
// Helm MCP Client - Main Entry Point
// Connects to the daemon and provides MCP interface for AI assistants

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { mySessionId } from "./state.js";
import { connectToDaemon, disconnectFromDaemon, ensureDaemonRunning } from "./connection.js";
import { tools, handleToolCall } from "./tools.js";

// MCP Server setup
const server = new Server(
  {
    name: "helm",
    version: "3.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, (args || {}) as Record<string, unknown>);
});

// Cleanup handlers
process.on("SIGINT", () => {
  console.error("[Client] SIGINT received, shutting down...");
  disconnectFromDaemon();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("[Client] SIGTERM received, shutting down...");
  disconnectFromDaemon();
  process.exit(0);
});

// Main entry point
async function main(): Promise<void> {
  console.error(`[Client] Helm MCP Client v3.0 starting...`);

  // Ensure daemon is running before connecting
  try {
    await ensureDaemonRunning();
  } catch (error) {
    console.error("[Client] Failed to ensure daemon is running:", error);
    process.exit(1);
  }

  // Connect to daemon
  try {
    await connectToDaemon();
    console.error(`[Client] Connected to daemon (session: ${mySessionId})`);
  } catch (error) {
    console.error("[Client] Failed to connect to daemon:", error);
    process.exit(1);
  }

  // Start MCP transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[Client] MCP transport ready`);
}

main().catch((error) => {
  console.error("[Client] Fatal error:", error);
  disconnectFromDaemon();
  process.exit(1);
});
