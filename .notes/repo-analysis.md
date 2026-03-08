# Repo Analysis

**Date:** 2026-03-08

## Decisions

## Implications

## Notes & Quirks

- The repo is self-referential: its own `@pinky` has line 1 == line 2, so it serves as both the brain and a test subject for itself.
- The skill (`pinky-memory`) is designed to fire automatically at session start/end — no user action required for memory capture.
- Memory is organized as `.brain/{slug}/{language}/{filepath}.md` — pure Markdown, Git-versioned.
- A `post-merge` hook + Python reindex script keeps `.brain/index.md` fresh without the AI needing to maintain it manually.
- Cross-project memory surfacing is the key differentiator: the AI can pull context from any registered project when working on another.
- Added `scripts/install.sh` (sh-compatible) and `scripts/install.ps1` (PowerShell) — one-liner installers that clone the brain, install the skill globally, and create `@pinky`.
- Install scripts target `~/.agents/skills/pinky-memory/` for the skill (matching the actual VS Code agents skill directory structure on the user's machine).
- README updated with a "Quick start" section showing `curl | sh` and `irm | iex` one-liners.
