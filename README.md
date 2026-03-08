# Pinky & the Brain

Distributed AI memory for your projects. Each project gets its own `{slug}.brain` git repo that stores decisions, pitfalls, and per-file notes across sessions.

This repo (`pinky-and-the-brain`) is the **skill hub** — it distributes the skill, agents, and install scripts. It stores no brain data itself.

## Quick start

Run one command from your project root to install the skill and create `@pinky`:

**macOS / Linux**
```sh
curl -fsSL https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.sh | sh
```

**Windows (CMD)**
```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.ps1)))"
```

**Windows (PowerShell)**
```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/main/scripts/install.ps1)))
```

This will:
1. Install the `pinky-memory` skill to `~/.agents/skills/pinky-memory/`
2. Install the `@brain` and `@pinky` agents to your VS Code prompts directory
3. Create an `@pinky` file pointing to your project's brain repo

That's it — the AI will pick up `@pinky` automatically on the next conversation.

## How it works

1. **Create a brain repo** for your project: `{slug}.brain` (e.g., `my-app.brain`)
2. **Add `@pinky`** to your project root with the brain repo URL:
   ```
   https://github.com/you/my-app.brain

   @links
   https://github.com/you/other-project.brain
   ```
3. **The AI skill activates** whenever it sees `@pinky` — it clones the brain repo to `~/.pinky/{slug}.brain/`, loads existing memory, and writes new notes after each session.
4. **Cross-project context** — `@links` in `@pinky` point to other brain repos the AI should read for related knowledge.

## Brain repo structure

Each `{slug}.brain` repository stores its data at the root:

```
meta.md                           ← project purpose, URLs, first indexed date
notes.md                          ← general project notes stored via @pinky
{language}/                       ← per-file notes grouped by language
  {path/to/file}.md              ← decisions, pitfalls, useful facts
```

No slug subdirectories — each brain repo is dedicated to one project.

## The `@brain` and `@pinky` agents

Two VS Code Copilot agents split the brain into read and write roles:

**`@brain` — answers questions** (read-only)

| Command | What it does |
|---|---|
| `@brain <question>` | Search the brain for information about a topic |
| `@brain list` | Show all known brain repos and their stored notes |
| `@brain list <slug>` | Show detailed contents for a specific brain repo |

**`@pinky` — stores information** (write)

| Command | What it does |
|---|---|
| `@pinky remember <info>` | Store a fact or decision in the brain repo |
| `@pinky forget <topic>` | Remove a specific note (with confirmation) |

## The `pinky-memory` skill

The `SKILL.md` at the root of this repo is the source of truth for the `pinky-memory` skill. When the skill hub is pulled, the global copy at `~/.agents/skills/pinky-memory/SKILL.md` is automatically updated.
