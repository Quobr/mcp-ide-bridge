# MCP IDE Bridge Monorepo

This repository contains the MCP IDE Bridge VS Code extension and an example MCP server implementation.

## Structure

- `vscode/`: The VS Code extension that provides the bridge between the IDE and MCP servers.
- `mcp_example/`: A sample MCP server that uses the Sync Code protocol to connect to the bridge.

## Getting Started

1. Install dependencies from the root:
   ```bash
   npm install
   ```

2. Build all projects:
   ```bash
   npm run build
   ```

## Development

- `npm run build:vscode`: Build the VS Code extension.
- `npm run build:example`: Build the MCP example server.
- `npm run clean`: Remove all build artifacts.
