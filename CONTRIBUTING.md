# Contributing to Helm

Thank you for your interest in contributing to Helm!

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- Chrome/Chromium browser
- Node.js 18+ (for some dev tools)

### Getting Started

1. Fork and clone the repository
2. Install dependencies:

```bash
cd daemon && bun install && cd ..
cd server && bun install && cd ..
cd client && bun install && cd ..
```

3. Load the extension in Chrome (see README)
4. Start the daemon: `cd daemon && bun run start`

## Code Style

- **Language**: TypeScript (strict mode)
- **Runtime**: Bun
- **Formatting**: 2-space indentation, no semicolons preferred
- **Imports**: Use `.js` extensions for local imports (Bun ESM)

## Project Structure

```
helm/
├── client/         # MCP client (connects to daemon)
├── daemon/         # Central coordinator
├── server/         # MCP server (legacy/direct mode)
├── extension/      # Chrome extension
└── shared/         # Shared types and config
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test locally with the extension and daemon
4. Commit with descriptive messages
5. Push and open a PR

## Testing

Currently testing is manual:

1. Start the daemon
2. Connect with an MCP client
3. Verify browser control works through the extension

## Reporting Issues

Please include:
- OS and browser version
- Bun version
- Steps to reproduce
- Error messages (from daemon, extension console)

## Questions?

Open an issue for discussion.
