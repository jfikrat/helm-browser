# Browser Control Extension - Architecture

## Overview

Chrome extension (Manifest V3) that provides browser automation capabilities for Claude. Uses ES modules with window isolation support.

## Module Structure

```
extension/
├── manifest.json      # Extension manifest (v3, ES modules)
├── background.js      # Entry point, initialization (~30 lines)
├── state.js           # Global state management (~55 lines)
├── websocket.js       # WebSocket connection & keepalive (~135 lines)
├── handlers.js        # Server message handlers (~175 lines)
├── windows.js         # Window isolation (~90 lines)
├── tabs.js            # Tab management (~115 lines)
├── commands.js        # DOM interaction commands (~315 lines)
├── popup-handler.js   # Popup communication (~55 lines)
├── popup.html         # Popup UI
├── popup.js           # Popup logic
└── content.js         # Content script
```

## Module Dependencies

```
                    ┌──────────────────┐
                    │  background.js   │  Entry point
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌───────────┐      ┌────────────┐     ┌──────────────┐
   │websocket.js│     │ windows.js │     │popup-handler │
   └─────┬─────┘      └─────┬──────┘     └──────┬───────┘
         │                  │                   │
         ▼                  │                   │
   ┌───────────┐            │                   │
   │handlers.js│◄───────────┘                   │
   └─────┬─────┘                                │
         │                                      │
         ├──────────────────────────────────────┤
         │                                      │
         ▼                                      ▼
   ┌───────────┐     ┌───────────┐       ┌───────────┐
   │  tabs.js  │     │commands.js│       │ state.js  │
   └─────┬─────┘     └─────┬─────┘       └───────────┘
         │                 │
         └────────┬────────┘
                  ▼
            ┌───────────┐
            │ windows.js│ (getWindowIdForSession)
            └───────────┘
```

## Module Responsibilities

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `background.js` | ~30 | Entry point, initialization |
| `state.js` | ~55 | Global variables and setters |
| `websocket.js` | ~135 | WS connection, keepalive, reconnect |
| `handlers.js` | ~175 | Message routing, command dispatch |
| `windows.js` | ~90 | Window isolation (create/close/get) |
| `tabs.js` | ~115 | Tab operations with isolation |
| `commands.js` | ~315 | DOM commands (click, type, scroll...) |
| `popup-handler.js` | ~55 | Popup message handling |

## Data Flow

### Command Execution

```
Server WebSocket Message
         │
         ▼
   websocket.js (onmessage)
         │
         ▼
   handlers.js (handleServerMessage)
         │
         ▼
   handlers.js (handleCommand) ─────┬────────────┬────────────┐
         │                          │            │            │
         ▼                          ▼            ▼            ▼
   windows.js                   tabs.js    commands.js   (direct)
   (window ops)                 (tab ops)  (DOM ops)     (ping)
         │                          │            │
         └──────────────────────────┴────────────┘
                                    │
                                    ▼
                        Result → websocket.js (sendMessage)
                                    │
                                    ▼
                              Server
```

### Window Isolation

```
1. Session registers on server
2. Server sends "create_window" command
3. windows.js creates chrome.windows.create()
4. sessionWindows Map: sessionId → windowId
5. All subsequent commands:
   - getTargetTab() checks sessionId
   - Filters tabs by windowId
   - Prevents cross-session access
```

## Key Concepts

### ES Modules (Manifest V3)

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

- All files use `import`/`export`
- No global namespace pollution
- Better code organization

### Keepalive (Service Worker Persistence)

Manifest V3 service workers can sleep. Two mechanisms:

1. **chrome.alarms** (Primary)
   - Fires every ~24 seconds
   - Survives service worker sleep
   - Reconnects if disconnected

2. **setInterval** (Backup)
   - 25 second interval
   - Sends keepalive to server

### Window Isolation Map

```javascript
// state.js
export const sessionWindows = new Map();
// Key: sessionId (string)
// Value: windowId (number)

// Usage in tabs.js
const windowId = getWindowIdForSession(sessionId);
const tabs = await chrome.tabs.query({ windowId });
```

## Command Categories

### Window Commands
| Command | Handler | Description |
|---------|---------|-------------|
| `create_window` | windows.js | Create isolated window |
| `close_window` | windows.js | Close session window |
| `get_session_window` | windows.js | Get window info |

### Tab Commands
| Command | Handler | Description |
|---------|---------|-------------|
| `get_tabs` | tabs.js | List tabs (filtered) |
| `switch_tab` | tabs.js | Switch to tab |
| `new_tab` | tabs.js | Open new tab |
| `close_tab` | tabs.js | Close tab |

### Navigation Commands
| Command | Handler | Description |
|---------|---------|-------------|
| `navigate` | commands.js | Go to URL |
| `screenshot` | commands.js | Capture visible |
| `get_content` | commands.js | Get page HTML/text |
| `get_url` | commands.js | Get current URL |

### DOM Commands
| Command | Handler | Description |
|---------|---------|-------------|
| `click` | commands.js | Click selector |
| `type` | commands.js | Type into input |
| `hover` | commands.js | Hover element |
| `scroll` | commands.js | Scroll page |
| `wait` | commands.js | Wait for element |
| `click_at` | commands.js | Click coordinates |
| `find_text` | commands.js | Find text on page |
| `execute` | commands.js | Run JavaScript |

## Editing Guidelines

### Adding New Command

1. Add function to appropriate module:
   - Window ops → `windows.js`
   - Tab ops → `tabs.js`
   - DOM ops → `commands.js`

2. Export function from module

3. Add case to `handlers.js:handleCommand()`

### Adding State

1. Add variable to `state.js`
2. Add setter function
3. Export both

### Modifying WebSocket

Edit `websocket.js`:
- `connect()` - Connection logic
- `sendMessage()` - Send to server
- `handleServerMessage()` imported from handlers.js

## Testing

1. Load extension in Chrome:
   ```
   chrome://extensions → Developer mode → Load unpacked
   → Select extension folder
   ```

2. Check service worker:
   ```
   chrome://extensions → Claude Browser Control → Service worker
   ```

3. Test via MCP:
   ```
   mcp__browser-control__browser_status
   mcp__browser-control__browser_navigate --url "https://google.com"
   mcp__browser-control__browser_screenshot
   ```

## Troubleshooting

### Import Errors
- Check `"type": "module"` in manifest.json
- Verify all imports use `.js` extension
- Check circular dependencies

### Window Isolation Not Working
- Check sessionWindows Map has entry
- Verify sessionId passed in params
- Check windows.js:getWindowIdForSession()

### Service Worker Sleeping
- Verify alarms permission in manifest
- Check chrome.alarms.create() called
- Look for "Alarm: reconnecting..." in console
