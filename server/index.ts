#!/usr/bin/env bun
// Helm - Multiplex MCP Server v2.1
// Singleton daemon with proxy mode for multiple MCP clients

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { mySessionId, setMySessionId, chromeProcess } from "./state.js";
import {
  checkExistingServer,
  startProxyMode,
  startServer,
  removeLockFile,
} from "./websocket.js";
import { registerSession, unregisterSession } from "./session.js";
import { tools, handleToolCall } from "./tools.js";
import { isProxyMode } from "./state.js";
import { sendProxyUnregister } from "./proxy.js";

// MCP Server setup
const server = new Server(
  {
    name: "helm",
    version: "2.1.0",
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
  if (isProxyMode) {
    // Graceful proxy shutdown - notify main server
    sendProxyUnregister();
  } else {
    // Main server cleanup
    if (mySessionId) unregisterSession(mySessionId);
    if (chromeProcess) {
      console.error("[MCP] Killing Chrome process...");
      chromeProcess.kill();
    }
    removeLockFile();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (isProxyMode) {
    // Graceful proxy shutdown - notify main server
    sendProxyUnregister();
  } else {
    // Main server cleanup
    if (mySessionId) unregisterSession(mySessionId);
    if (chromeProcess) {
      console.error("[MCP] Killing Chrome process...");
      chromeProcess.kill();
    }
    removeLockFile();
  }
  process.exit(0);
});

// Main entry point
async function main() {
  console.error(`[MCP] Helm MCP Server v2.1 starting...`);

  // Check if another server is already running
  const serverExists = await checkExistingServer();

  if (serverExists) {
    // Start in proxy mode - connect to existing main server
    await startProxyMode();
    // mySessionId is set inside startProxyMode()
    console.error(`[MCP] Running in PROXY MODE (session: ${mySessionId})`);
  } else {
    // Start as main server (WebSocket hub)
    await startServer();
    // Main server also registers its own session (like proxy does)
    const sessionId = await registerSession(process.env.HELM_SESSION_LABEL);
    setMySessionId(sessionId);
    console.error(`[MCP] Running as MAIN SERVER (session: ${sessionId})`);
  }

  // Start MCP transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[MCP] MCP transport ready`);
}

main().catch((error) => {
  console.error("[MCP] Fatal error:", error);
  process.exit(1);
});
