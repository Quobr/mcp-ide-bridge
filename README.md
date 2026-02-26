# MCP IDE Bridge

**A universal MCP ↔ IDE communication layer.** This toolkit lets your AI agents interact with your IDE in real-time — opening files, dispatching AI actions, showing live feedback — all through the MCP protocol.

---

## Why MCP IDE Bridge?

When an AI agent executes an MCP tool, the result is usually just text. But many use cases demand richer interaction: *open this file*, *send this diff to the AI chat*, *highlight these lines*. Each IDE exposes a different API to do this.

MCP IDE Bridge solves this in two ways:
1. **An IPC channel** between a running MCP server and any active IDE window, established securely over a local Unix socket.
2. **An abstraction layer** for common IDE AI actions, so your code doesn't care whether the user is running Cursor, Windsurf, VS Code, or any other fork.

---

## How It Works: The Sync Code Protocol

The core concept is a **Sync Code** — a short 4-character identifier (e.g. `TYPN`) that uniquely represents a specific IDE window. It's designed to be short enough that agents can remember and pass it around as a tool argument.

### Connection Flow

```
                    ┌─────────────────────────┐
                    │         AGENT           │
                    │  (Claude, GPT, etc.)    │
                    └───────────┬─────────────┘
                                │  MCP Tools
                    ┌───────────▼─────────────┐
                    │       MCP SERVER        │
                    │   (your mcp_example)    │
                    └───────────┬─────────────┘
                                │  Unix Socket (IPC)
                    ┌───────────▼─────────────┐
                    │    VS CODE EXTENSION    │
                    │   (mcp-ide-bridge)      │
                    └───────────┬─────────────┘
                                │  VS Code API
                    ┌───────────▼─────────────┐
                    │         THE IDE         │
                    │  (any VS Code fork)     │
                    └─────────────────────────┘
```

### Step-by-Step

1. **The extension starts** and registers a local socket (`~/.mcp_ide_bridge/sockets/<ide>-<syncCode>-<pid>.sock`).
2. **The agent calls `request_ide_connection`**. The MCP server broadcasts a notification to all active IDE windows of the configured type.
3. **The user clicks "Connect Agent Here"** in their IDE. That window is now linked to this agent session.
4. **The agent receives the Sync Code** (e.g. `TYPN`) and can pass it to any subsequent tool that needs IDE interaction.
5. **Tools call the IDE directly** via the socket using the Sync Code — opening files, running commands, triggering AI actions — all without leaving the agent's flow.

### Alternative: Direct Sync Code

If the user already knows their Sync Code (visible in the IDE status bar), they can tell the agent directly and skip the handshake:

```
"My sync code is TYPN, open the file src/server.ts"
```

---

## IDE Support

Currently, only **Antigravity** is integrated. The abstraction layer (`vscode/src/lab/ai-mapper.ts`) is designed to make adding support for other IDEs straightforward — each one just needs its command mappings added.

| IDE | Send to Chat | New Conversation |
|---|---|---|
| **Antigravity** | ✅ | ✅ |
| Cursor | planned | planned |
| Windsurf | planned | planned |

> Want to add your IDE? The `AI_CAPABILITIES` map in `ai-mapper.ts` is the only place you need to touch.

---

## Repository Structure

```
mcp-ide-bridge/
│
├── vscode/          # VS Code Extension
│   └── src/
│       ├── core/    # IPC server, Sync Code generation, IDE detection
│       ├── handlers/# IPC message handlers (ping, files, AI actions, etc.)
│       ├── lab/     # Experimental: AI action mapper, command fuzzer
│       └── api/     # Handler registry
│
├── mcp_example/     # Example MCP Server implementation
│   └── src/
│       └── index.ts # Demonstrates request_ide_connection, connect_ide, ide_open_file
│
├── package.json     # Monorepo root (npm workspaces)
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A supported IDE (VS Code, Cursor, Windsurf, etc.)

### Installation

```bash
# Install all dependencies from the monorepo root
npm install
```

### Build Everything

```bash
npm run build
```

### Install the VS Code Extension

1. Build the extension: `npm run build:vscode`
2. Package it: `cd vscode && npx vsce package`
3. Install the generated `.vsix` in your IDE.

### Run the Example MCP Server

Configure your agent (e.g. Claude) to use the example server:

```json
{
  "mcpServers": {
    "mcp-ide-bridge-example": {
      "command": "node",
      "args": ["/path/to/mcp_ide_bridge/mcp_example/dist/index.js"]
    }
  }
}
```

---

## Adding IDE Capabilities to Your Own MCP Server

You don't need the example server. You can add the bridge pattern to any existing MCP server. Just:

1. Copy the IPC communication logic from `mcp_example/src/index.ts`.
2. Add `request_ide_connection` and `connect_ide` as tools.
3. Optionally add a `syncCode` parameter to your own tools for direct connection.

---

## Development Scripts

| Command | Description |
|---|---|
| `npm run build` | Builds all packages |
| `npm run build:vscode` | Builds the VS Code extension only |
| `npm run build:example` | Builds the MCP example server only |
| `npm run clean` | Removes all build artifacts |

---

## License

MIT
