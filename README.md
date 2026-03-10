# 🧠 Pinky & The Brain

Persistent AI memory that lives in your repo. One URL. Zero config.

## Install

Tell your AI agent:

```
Follow instructions in https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/pinky.brain
```

That's it. The agent will:
1. Fetch `pinky.brain` and save it to your project root
2. Create `.pinky/` with the required data files
3. Add `.pinky/` to `.gitignore`
4. Start remembering

Works with any AI coding assistant that can read URLs and write files.

## What It Does

- **Rules** — Coding preferences that persist across sessions
- **Ideas** — Things to build, scored by relevance + impact
- **Notes** — Discovered context, auto-decayed by freshness
- **Todos** — Tracked tasks with priority scoring
- **Files** — Registry of important files in your project

## Multi-Repo

Each subfolder can have its own `.pinky/` — monorepos, submodules, vendor packages.
Add external brain repos to the SOURCES section in `pinky.brain`:

```
@https://github.com/org/shared-standards.git
@https://github.com/org/team-conventions.git
```

## Branch Isolation

Memory data lives on a separate orphan branch (`pinky`).
Your working branches stay clean — no `.brain` files in your commits.
