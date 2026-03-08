# SKILL.md

## Purpose
Defines the `pinky-memory` Copilot skill — the complete procedure the AI follows to sync, read, write, and commit memory to/from the brain repo. This is the source of truth; the global copy at `~/.copilot/skills/pinky-memory/SKILL.md` is kept in sync from here.

## Key Decisions
- Skill lives in the brain repo itself, not just globally, so it is versioned and shared with the repo
- Self-referential case (line 1 == line 2 in `@pinky`) skips clone/pull — the working directory IS the brain
- Index file (`.brain/index.md`) used for fast cross-project lookup instead of listing all subdirectories
- `# interesting` section in `@pinky` lets the AI search related repos even if they have no local slug folder
- Skill auto-sync step (step 9) ensures the global `~/.copilot/skills/` copy never drifts from the brain

## Pitfalls
- The skill is a *definition*, not a daemon — the AI must actively follow its steps each session; it won't run automatically without being triggered
- Forgetting to execute steps 4–9 means `.brain/` files never get written — the system only works if the AI completes the full procedure, not just reads the skill
- `marble-memory` was a predecessor skill with a different marker file (`@marble`) and different local path (`~/.marble`) — it has been deleted and replaced

## Useful Facts
- Step 9 (global skill sync) should `cp SKILL.md ~/.copilot/skills/pinky-memory/SKILL.md` after any pull
- The YAML frontmatter `name` field must match the folder name under `~/.copilot/skills/`
- `.brain/.gitkeep` ensures the `.brain/` directory is tracked by git even when empty

## Last Updated
- 2026-03-08T00:00:00Z
- Source repo: https://github.com/yesitsfebreeze/pinky-and-the-brain
