---
name: helm-browser
description: Browser automation via MCP using your real Chrome browser. Use when the user asks to navigate websites, scrape data, fill forms, take screenshots, or automate browser tasks. Unlike headless browsers, helm controls the user's actual Chrome via a lightweight extension.
---

# Browser Automation with helm-browser

helm-browser is an MCP server + Chrome extension that gives AI agents real browser control. No headless Chromium, no Playwright, no Selenium — just your actual Chrome.

## Architecture

```
AI Agent ──(MCP)──▶ Helm Server ──(WebSocket)──▶ Chrome Extension
```

- **Extension**: Lightweight Chrome extension (Side Panel UI)
- **Daemon**: WebSocket coordinator on port 9876
- **Server**: MCP server exposing browser tools

## Setup

```bash
# Install
git clone https://github.com/jfikrat/helm-browser.git
cd helm-browser && cd daemon && bun install && cd ../server && bun install && cd ..

# Start daemon
cd daemon && bun run index.ts &

# Load extension in Chrome:
# 1. chrome://extensions → Developer mode ON
# 2. Load unpacked → select extension/ folder

# Add to MCP config
{
  "mcpServers": {
    "helm": {
      "command": "bun",
      "args": ["run", "/path/to/helm-browser/server/index.ts"]
    }
  }
}
```

## Core Workflow

Every browser automation follows this pattern:

1. **Navigate**: Go to a URL
2. **Read**: Get text or take a screenshot
3. **Interact**: Click, type, scroll using CSS selectors
4. **Verify**: Screenshot or read text to confirm result

```
browser_navigate("https://example.com")
browser_screenshot()
browser_click("button.submit")
browser_get_element_text("h1.title")
```

## Available Tools

### Navigation
| Tool | Description |
|------|-------------|
| `browser_navigate(url)` | Navigate to a URL |
| `browser_get_url()` | Get current URL and title |
| `browser_get_tabs()` | List all open tabs |
| `browser_switch_tab(tabId)` | Switch to a specific tab |
| `browser_new_tab(url?)` | Open a new tab |
| `browser_close_tab(tabId?)` | Close a tab |

### Reading Content
| Tool | Description |
|------|-------------|
| `browser_screenshot(selector?)` | Take a screenshot (full page or element) |
| `browser_get_element_text(selector)` | Get text content of an element |
| `browser_find_text(text, click?)` | Find text on page, optionally click it |
| `browser_get_cookies(url?, name?)` | Get cookies for a URL |

### Interaction
| Tool | Description |
|------|-------------|
| `browser_click(selector)` | Click using CSS selector |
| `browser_click_at(x, y)` | Click at specific coordinates |
| `browser_type(selector, text)` | Type text into an input |
| `browser_paste(text, selector?)` | Paste text (for long content) |
| `browser_hover(selector)` | Hover over an element |
| `browser_scroll(direction, amount?)` | Scroll page or element |
| `browser_press_key(key)` | Press a keyboard key |

### Advanced
| Tool | Description |
|------|-------------|
| `browser_execute(code)` | Execute JavaScript in the page |
| `browser_record(execute, duration?)` | Record browser tab as video |
| `browser_status()` | Check extension connection status |

## Common Patterns

### Web Scraping

```
browser_navigate("https://news.ycombinator.com")
browser_get_element_text(".titleline > a")  # Get top story title
browser_screenshot()                         # Visual verification
```

### Form Filling

```
browser_navigate("https://example.com/login")
browser_type("[name='email']", "user@example.com")
browser_type("[name='password']", "secret")
browser_click("[type='submit']")
browser_screenshot()  # Verify login success
```

### Multi-tab Workflow

```
browser_new_tab("https://github.com/trending")
browser_get_tabs()                    # See all tabs
browser_switch_tab(tabId)             # Switch between tabs
browser_get_element_text("article h2 a")  # Read content
```

### Data Extraction with JavaScript

```
browser_execute("document.querySelectorAll('.price').length")
browser_execute("JSON.stringify([...document.querySelectorAll('a')].map(a => ({text: a.textContent, href: a.href})))")
```

## Tips

- **CSS selectors over coordinates**: `browser_click("[data-testid='submit']")` is more reliable than `browser_click_at(500, 300)`
- **Screenshot for verification**: Always screenshot after navigation or interaction to confirm state
- **Wait for content**: Pages may need time to load. If `browser_get_element_text` returns empty, try again after a moment
- **Use browser_find_text for visible text**: When you know the text but not the selector, `browser_find_text("Sign In", true)` finds and clicks it
- **Real browser advantage**: Since this uses your actual Chrome, you're already logged into sites, have cookies, extensions, etc.

## Differences from Headless Browsers

| Feature | helm-browser | Headless (Playwright/Puppeteer) |
|---------|-------------|-------------------------------|
| Browser | Your real Chrome | Separate Chromium instance |
| Sessions | Already logged in | Must authenticate each time |
| Extensions | Your extensions work | No extensions |
| Detection | Not detected as bot | Often blocked |
| Setup | Extension + daemon | npm install + binary |
| Protocol | MCP native | Custom API |
