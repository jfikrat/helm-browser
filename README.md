# Helm

Browser control for AI coding assistants via Model Context Protocol (MCP).

## Overview

Helm enables AI assistants to interact with web browsers through a standardized MCP interface. It provides tools for navigation, clicking, typing, screenshots, and more.

## Supported Clients

- **Claude Code** - Anthropic's CLI coding assistant
- **Gemini CLI** - Google's command-line AI
- **Codex CLI** - OpenAI's coding assistant
- **Aider** - AI pair programming in terminal
- Any MCP-compatible client

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Client     │────▶│   Helm Daemon   │────▶│ Chrome Extension│
│ (Claude, etc.)  │ WS  │   (Port 9876)   │ WS  │   (Side Panel)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │     │   MCP Server    │
│  (client/*.ts)  │     │ (server/*.ts)   │
└─────────────────┘     └─────────────────┘
```

**Components:**
- **Extension**: Chrome extension with side panel for session management
- **Daemon**: Central coordinator that routes commands between clients and extension
- **Server**: MCP server for direct extension communication
- **Client**: MCP client for AI assistants that need browser control

## Installation

### Prerequisites
- [Bun](https://bun.sh) runtime
- Chrome/Chromium browser

### 1. Clone and Install

```bash
git clone https://github.com/jfikrat/helm-browser.git
cd helm-browser

# Install dependencies
cd daemon && bun install && cd ..
cd server && bun install && cd ..
cd client && bun install && cd ..
```

### 2. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### 3. Start Daemon

```bash
cd daemon && bun run start
```

Or set up as a systemd user service (Linux):

```bash
# Create service file
cat > ~/.config/systemd/user/helm-daemon.service << EOF
[Unit]
Description=Helm Browser Daemon

[Service]
ExecStart=/path/to/bun run /path/to/helm-browser/daemon/index.ts
Restart=always

[Install]
WantedBy=default.target
EOF

systemctl --user enable helm-daemon
systemctl --user start helm-daemon
```

### 4. Configure Your AI Assistant

Add to your MCP configuration (e.g., `~/.claude/claude.json`):

```json
{
  "mcpServers": {
    "helm": {
      "command": "bun",
      "args": ["run", "/path/to/helm-browser/client/index.ts"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_get_url` | Get current page URL and title |
| `browser_get_tabs` | List all open tabs |
| `browser_switch_tab` | Switch to a specific tab |
| `browser_new_tab` | Open a new tab |
| `browser_close_tab` | Close a tab |
| `browser_click` | Click element by CSS selector |
| `browser_click_at` | Click at X,Y coordinates |
| `browser_type` | Type text into an input |
| `browser_paste` | Paste text via clipboard |
| `browser_hover` | Hover over an element |
| `browser_scroll` | Scroll the page |
| `browser_press_key` | Send keyboard input |
| `browser_screenshot` | Take a screenshot |
| `browser_get_element_text` | Get text from an element |
| `browser_find_text` | Find text on page with OCR |
| `browser_status` | Check extension connection |

## Session Isolation

Each MCP client gets its own isolated browser window. The side panel shows all active sessions and allows manual routing of tabs to specific sessions.

## Development

```bash
# Run daemon in development
cd daemon && bun run --watch start

# Run server in development
cd server && bun run --watch start

# Run client in development
cd client && bun run --watch start
```

## License

MIT License - see [LICENSE](LICENSE) for details.
