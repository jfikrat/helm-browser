# Browser Control MCP Server - Architecture

## Overview

Browser Control MCP is a Model Context Protocol server that enables Claude to control Chrome browsers. It supports multiple Claude instances through a singleton daemon pattern with proxy mode.

## Module Structure

```
server/
├── index.ts        # Entry point, MCP server setup
├── config.ts       # Configuration constants
├── types.ts        # TypeScript interfaces
├── state.ts        # Global state management
├── commands.ts     # Command routing (to extension/proxy)
├── session.ts      # Session lifecycle management
├── chrome.ts       # Chrome auto-start functionality
├── lock.ts         # Lock file & server detection
├── proxy.ts        # Proxy mode (secondary instances)
├── handlers.ts     # WebSocket message handlers
├── websocket.ts    # WebSocket server setup
└── tools.ts        # MCP tool definitions & handlers
```

## Module Dependencies

```
                    ┌──────────────┐
                    │   index.ts   │  Entry point
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌────────────┐    ┌──────────┐
   │ tools.ts │     │websocket.ts│    │session.ts│
   └────┬─────┘     └─────┬──────┘    └────┬─────┘
        │                 │                 │
        │     ┌───────────┼───────────┐     │
        │     │           │           │     │
        ▼     ▼           ▼           ▼     ▼
   ┌──────────┐     ┌──────────┐    ┌──────────┐
   │commands.ts│◄───│handlers.ts│───►│ state.ts │
   └────┬─────┘     └──────────┘    └────┬─────┘
        │                                 │
        ▼                                 │
   ┌──────────┐     ┌──────────┐          │
   │chrome.ts │     │ proxy.ts │◄─────────┘
   └────┬─────┘     └────┬─────┘
        │                │
        ▼                ▼
   ┌──────────┐     ┌──────────┐
   │ config.ts│     │ lock.ts  │
   └──────────┘     └──────────┘
        │                │
        ▼                ▼
   ┌─────────────────────────┐
   │       types.ts          │
   └─────────────────────────┘
```

## Module Responsibilities

### Core Modules

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `index.ts` | ~90 | Entry point, MCP server setup, cleanup handlers |
| `config.ts` | ~25 | Port, paths, timeouts, protocol version |
| `types.ts` | ~55 | Session, ExtensionConnection, IncomingMessage types |
| `state.ts` | ~60 | Global state variables and setters |

### Communication Modules

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `commands.ts` | ~115 | Route commands to extension or proxy |
| `handlers.ts` | ~230 | Process incoming WebSocket messages |
| `websocket.ts` | ~100 | Bun.serve WebSocket server setup |
| `proxy.ts` | ~80 | Connect to main server as secondary instance |
| `lock.ts` | ~50 | Lock file management, server detection |

### Feature Modules

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `session.ts` | ~155 | Register/unregister sessions, window isolation |
| `chrome.ts` | ~85 | Find and auto-start Chrome browser |
| `tools.ts` | ~435 | MCP tool definitions and call handlers |

## Data Flow

### 1. Main Server Mode (First Claude Instance)

```
Claude MCP Request
       │
       ▼
   index.ts (CallToolRequestSchema)
       │
       ▼
   tools.ts (handleToolCall)
       │
       ▼
   commands.ts (sendCommand → sendCommandToExtension)
       │
       ▼
   Extension (via WebSocket)
       │
       ▼
   handlers.ts (handleRouteResult)
       │
       ▼
   Response to Claude
```

### 2. Proxy Mode (Secondary Claude Instances)

```
Claude MCP Request
       │
       ▼
   index.ts (CallToolRequestSchema)
       │
       ▼
   tools.ts (handleToolCall)
       │
       ▼
   commands.ts (sendCommand → sendProxyCommand)
       │
       ▼
   Main Server (via WebSocket)
       │
       ▼
   handlers.ts (handleProxyCommand)
       │
       ▼
   Extension
       │
       ▼
   Response via proxy.ts (handleProxyMessage)
       │
       ▼
   Response to Claude
```

## Key Concepts

### Singleton Daemon Pattern

1. First Claude instance starts WebSocket server on port 9876
2. Writes lock file to `~/.claude/mcp/browser-control/.server.lock`
3. Subsequent instances detect running server via `checkExistingServer()`
4. Secondary instances connect as proxy clients

### Window Isolation

Each Claude session gets its own Chrome window:
- `session.ts:registerSession()` creates isolated window
- `sessionWindows` map in extension tracks session → windowId
- All commands include `sessionId` for window scoping

### Auto-Start Chrome

If extension not connected:
1. `commands.ts:sendCommandToExtension()` calls `ensureExtensionConnected()`
2. `chrome.ts:startChrome()` launches Chrome
3. Waits up to 15s for extension WebSocket connection

## Message Protocol

### Server → Extension

```typescript
{ type: "route", reqId, sessionId, payload: { command, params } }
{ type: "welcome", payload: { serverId, protocolVersion, sessions } }
{ type: "sessions", payload: { sessions, defaultSessionId, tabRouting } }
```

### Extension → Server

```typescript
{ type: "hello", payload: { profileId, capabilities } }
{ type: "route_result", reqId, sessionId, payload: result }
{ type: "error", reqId, payload: { code, message } }
{ type: "keepalive" }
```

### Proxy ↔ Main Server

```typescript
// Proxy → Main
{ type: "register_proxy_session", payload: { sessionId, label } }
{ type: "proxy_command", reqId, sessionId, payload: { command, params } }

// Main → Proxy
{ type: "proxy_response", reqId, sessionId, payload: result }
{ type: "proxy_error", reqId, sessionId, payload: { message } }
```

## Editing Guidelines

### Adding New Tool

1. Add tool definition to `tools.ts:tools[]`
2. Add command mapping to `tools.ts:toolToCommand`
3. If special handling needed, add case in `handleToolCall()`

### Adding New Message Type

1. Add type to `types.ts:IncomingMessage` if needed
2. Add handler in `handlers.ts`
3. Add case to `handleExtensionMessage()` switch

### Modifying State

1. Add variable to `state.ts`
2. Add setter function if needed
3. Export from `state.ts`

### Adding Config

1. Add constant to `config.ts`
2. Export from `config.ts`

## Testing

```bash
# Type check
bunx tsc --noEmit --esModuleInterop --module nodenext --moduleResolution nodenext --target esnext index.ts

# Runtime test
timeout 3 bun run index.ts

# Full test with browser
mcp__browser-control__browser_status
mcp__browser-control__browser_navigate --url "https://google.com"
mcp__browser-control__browser_screenshot
```
