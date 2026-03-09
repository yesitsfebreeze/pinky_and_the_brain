# p&b MCP Server

MCP server for Pinky & The Brain — provides typed tool calls and resource access so AI assistants interact with brain memory programmatically instead of writing raw markdown.

## Tools

| Tool | Description |
|---|---|
| `remember(text, concepts[], sources[], rating?)` | Store a rated note into thoughts.md |
| `forget(query)` | Search + remove matching notes |
| `query(topic, depth?)` | Search thoughts.md + linked repos with concept expansion |
| `prune(threshold?)` | Remove notes below threshold |
| `sync()` | Pull brain repo, rebase, push, and upsert global `repos.md` catalog |
| `plan_add(todo)` | Add a todo below the @plan separator |
| `plan_next()` | Return the next highest-impact todo |
| `plan_complete(todo)` | Mark a todo done and remove it |

## Resources

| URI | Description |
|---|---|
| `patb://thoughts` | Full note pool (thoughts.md) |
| `patb://tree` | File impact map (tree.md) |
| `patb://changes` | Cross-project changelog (changes.md) |
| `patb://plan` | Current @plan file contents |

## Setup

The p&b installer (`SETUP.md`) handles building and configuring the MCP server automatically when `node` and `npm` are in PATH.

To add MCP to an existing p&b install, or to build manually:

**1. Build the server**
```sh
cd ~/.agents/skills/patb/mcp
npm install
npm run build
```
*(The MCP source is cloned from this repo into `~/.agents/skills/patb/mcp/` by the installer.)*

**2. Add `.vscode/mcp.json` to your project** (VS Code + GitHub Copilot)

Unix / macOS:
```json
{
  "servers": {
    "patb": {
      "type": "stdio",
      "command": "node",
      "args": ["${env:HOME}/.agents/skills/patb/mcp/dist/index.js"],
      "env": {
        "PATB_SOURCE_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

Windows:
```json
{
  "servers": {
    "patb": {
      "type": "stdio",
      "command": "node",
      "args": ["${env:USERPROFILE}/.agents/skills/patb/mcp/dist/index.js"],
      "env": {
        "PATB_SOURCE_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

Once the server is running, all p&b commands (`remember`, `forget`, `query`, `prune`, `sync`, `plan_*`) use typed MCP tool calls instead of writing markdown directly. The AI skill remains active as a fallback when MCP is unavailable.

`sync()` also maintains a global catalog at `~/.patb/pinky-and-the-brain.patb/repos.md` with one row per source repo using p&b.

## Structure

```
mcp/
  package.json
  tsconfig.json
  src/
    index.ts              — MCP server entry
    config.ts             — parse @brain YAML config
    tools/
      remember.ts
      forget.ts
      query.ts
      prune.ts
      sync.ts
      plan.ts
    resources/
      thoughts.ts
      tree.ts
      changes.ts
      plan.ts
    lib/
      storage.ts          — read/write markdown memory files
      note.ts             — note schema + validation
      concepts.ts         — concept tag index (concepts.md)
      git.ts              — git operations (pull, commit, push)
```
