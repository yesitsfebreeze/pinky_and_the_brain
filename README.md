# Pinky And The Brain

This is the **brain repo** — a shared AI memory store for all your projects.

Each project that opts in adds an `@pinky` file at its root pointing here. The AI then stores per-file notes, decisions, pitfalls, and project metadata under `.brain/{project-slug}/` in this repo, committed and pushed after each session.

## Quick start

Run one command from your project root to install the skill and create `@pinky`:

**macOS / Linux**
```sh
curl -fsSL https://raw.githubusercontent.com/yesitsfebreeze/pinky_and_the_brain/main/scripts/install.sh | sh
```

**Windows (CMD)**
```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/yesitsfebreeze/pinky_and_the_brain/main/scripts/install.ps1)))"
```

**Windows (PowerShell)**
```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/yesitsfebreeze/pinky_and_the_brain/main/scripts/install.ps1)))
```

This will:
1. Clone the brain repo to `~/.pinky/` (or pull if it already exists)
2. Install the `pinky-memory` skill to `~/.agents/skills/pinky-memory/`
3. Create an `@pinky` file pointing to this brain and your project's origin

That's it — the AI will pick up `@pinky` automatically on the next conversation.

## How it works

1. **Add `@pinky` to your project** with two lines:
   ```
   https://github.com/yesitsfebreeze/pinky_and_the_brain
   https://github.com/you/your-project
   ```
2. **The AI skill activates** whenever it sees `@pinky` — it clones this repo to `~/.pinky/`, reads the existing memory for your project, and writes new notes after each session.
3. **Memory is cross-project** — the AI scans `.brain/index.md` and all slug folders to surface relevant context from any registered project.

## Structure

```
.brain/
  index.md                        ← fast lookup: all projects + one-line purpose
  {project-slug}/
    meta.md                       ← project purpose, URLs, first indexed date
    {language}/
      {path/to/file}.md           ← per-file decisions, pitfalls, useful facts
```

## The skill

The `SKILL.md` at the root of this repo is the source of truth for the `pinky-memory` skill. When the brain repo is pulled, the global copy at `~/.copilot/skills/pinky-memory/SKILL.md` is automatically updated.

## Self-referential

This repo's own `@pinky` has line 1 == line 2, meaning this repo *is* the brain. No separate clone is needed — the AI works in this directory directly.
