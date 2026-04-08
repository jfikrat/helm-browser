# Helm Browser

Browser control for AI coding assistants via MCP. Your real Chrome, not a headless instance.

[![skills.sh](https://img.shields.io/badge/skills.sh-helm--browser-blue)](https://skills.sh/jfikrat/helm-browser/helm-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

```bash
npx skills add jfikrat/helm-browser
```

## Highlights

- ~57 tools across navigation, reading, interaction, scripting, state, and multi-target control
- Persistent debugger sessions with per-tab serialization for debugger-mutating commands
- Semantic locators via `browser_get_snapshot()` and `locator` support for stable element targeting
- Multi-target support for iframes, popups, and dialogs

## Why Helm?

Most browser automation tools launch a separate headless Chromium. Helm takes a different approach: it controls **your actual Chrome** through a lightweight extension.

| | Helm Browser | Headless (Playwright/Puppeteer) |
|---|---|---|
| Browser | Your real Chrome | Separate Chromium instance |
| Auth | Already logged in | Must authenticate each time |
| Extensions | Your extensions work | No extensions |
| Bot detection | Not detected | Often blocked |
| Binary size | 0 MB (uses your Chrome) | ~200 MB Chromium download |
| Protocol | MCP native | Custom API |

## Supported Clients

- **Claude Code** - Anthropic's CLI
- **Codex CLI** - OpenAI
- **Gemini CLI** - Google
- **Aider** - AI pair programming
- Any MCP-compatible client

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Client     │────▶│   Helm Daemon   │────▶│ Chrome Extension│
│ (Claude, etc.)  │ WS  │   (Port 9876)   │ WS  │   (Side Panel)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **Extension**: Chrome extension with side panel UI
- **Daemon**: WebSocket coordinator on port 9876
- **Server**: MCP server exposing browser tools
- **Client**: MCP client for AI assistants

## Quick Start

### Prerequisites
- Chrome or Chromium

### 1. Install

```bash
git clone https://github.com/jfikrat/helm-browser.git
cd helm-browser
./install.sh
```

### 2. Load Chrome Extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/` folder

`install.sh` installs Bun if needed, runs `bun install` in `daemon/`, `server/`, and `client/`, and registers the daemon as a user service (`systemd` on Linux, `launchd` on macOS). It is safe to re-run.

To remove the service and installed dependencies later:

```bash
./uninstall.sh
```

### 3. Configure MCP

Add to your MCP config (e.g., `~/.claude/claude.json`):

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

## Tools

### Navigation

| Tool | Description |
|------|-------------|
| `browser_navigate(url)` | Navigate to a URL |
| `browser_get_url()` | Get current URL and title |
| `browser_get_tabs()` | List all open tabs |
| `browser_switch_tab(tabId)` | Switch to a tab |
| `browser_new_tab(url?)` | Open a new tab |
| `browser_close_tab(tabId?)` | Close a tab |

### Reading

| Tool | Description |
|------|-------------|
| `browser_screenshot(selector?)` | Screenshot (full page or element) |
| `browser_get_element_text(selector)` | Get text content of an element |
| `browser_get_snapshot()` | Snapshot interactive elements with stable refs |
| `browser_find_text(text, click?)` | Find text on page, optionally click it |
| `browser_wait_for_function(expression, timeout?, interval?)` | Poll a JS expression until truthy |
| `browser_get_cookies(url?, name?)` | Get cookies |

### Interaction

| Tool | Description |
|------|-------------|
| `browser_click(selector)` | Click by CSS selector |
| `browser_right_click(selector)` | Right-click an element |
| `browser_double_click(selector)` | Double-click an element |
| `browser_click_at(x, y)` | Click at coordinates |
| `browser_type(selector, text)` | Type into an input |
| `browser_paste(text, selector?)` | Paste text (for long content) |
| `browser_hover(selector)` | Hover over an element |
| `browser_scroll(direction, amount?)` | Scroll page or element |
| `browser_press_key(key)` | Press a keyboard key |
| `browser_press_keys(keys)` | Press a key chord |
| `browser_select(selector, value)` | Select a dropdown option |
| `browser_set_cookie(...)` | Set a browser cookie |
| `browser_clear_cookies(...)` | Clear cookies for a URL |

### Targets & Debugging

| Tool | Description |
|------|-------------|
| `browser_list_targets()` | List tabs and their iframes in the current session |
| `browser_wait_for_popup(timeout?, tabId?)` | Wait for a new tab or popup window |
| `browser_wait_for_dialog(timeout?, tabId?)` | Wait for alert/confirm/prompt dialogs |
| `browser_handle_dialog(accept?, promptText?, tabId?)` | Accept or dismiss a dialog |
| `browser_debug_status()` | Inspect debugger sessions, observers, and recordings |

### Advanced

| Tool | Description |
|------|-------------|
| `browser_execute(code)` | Run JavaScript in the page |
| `browser_record(execute, duration?)` | Record tab as video |
| `browser_status()` | Check extension connection |

## Examples

### Web Scraping
```
> Navigate to Hacker News, get the top 3 story titles

browser_navigate("https://news.ycombinator.com")
browser_get_element_text(".titleline > a")
```

### Form Automation
```
> Log into my dashboard

browser_navigate("https://app.example.com/login")
browser_type("[name='email']", "user@example.com")
browser_type("[name='password']", "secret")
browser_click("[type='submit']")
```

### Multi-tab Research
```
> Open GitHub trending and compare top 2 repos

browser_navigate("https://github.com/trending")
browser_get_element_text("article.Box-row:first-child h2 a")
browser_click("article.Box-row:first-child h2 a")
browser_screenshot()
```

### Semantic Targeting
```
> Use stable refs instead of brittle selectors

browser_get_snapshot()
browser_click({ "ref": "e42" })
browser_type({ "label": "Email address" }, "user@example.com")
```

## Session Isolation

Each MCP client gets its own isolated browser window. The side panel shows active sessions and allows manual tab routing.

## Development

```bash
cd daemon && bun run --watch start   # Daemon with hot reload
cd server && bun run --watch start   # Server with hot reload
cd client && bun run --watch start   # Client with hot reload
```

## License

MIT - see [LICENSE](LICENSE)
