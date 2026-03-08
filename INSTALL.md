# Pinky & The Brain — Installer

This file is fetched and executed by the README.
Configuration variables come from the README's configuration table.


## Pre-flight

Check: does @pinky exist at the workspace root?
If YES: stop — already installed. Offer to re-run installation to update.
If NO: continue with installation.

If DRY_RUN is set to TRUE:
  Simulate every step. Do not write, delete, or modify any files.
  Report exactly what would have happened.


## Resolve Identity

Derive {slug} from Current repo URL:
  last path segment → strip .git → lowercase → replace non-alphanumeric (except - _) with -
Set brain repo URL = {current-repo-url}.patb
Set brain root = ~/.patb/{slug}.patb/


## Skill Bootstrap

Create directory ~/.agents/skills/pinky-memory/ if it doesn't exist.
Write the following verbatim to ~/.agents/skills/pinky-memory/SKILL.md
(overwrite if it exists):

````
---
name: pinky-memory
description: >
  Manage cross-repository AI memory with per-project brain repos ({slug}.patb).
  Use when a repo has @pinky and @brain files, to sync memory, capture
  decisions/pitfalls/useful notes into a rated note pool (thoughts.md), and persist
  them in the project's dedicated brain repo. Also triggers on: "remember this",
  "what do you know about", decisions/pitfalls capture, memory sync requests.
argument-hint: 'Optional: focus area or file path (e.g. "auth refactor" or "src/main.ts")'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

Read and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SKILL.md
````


## Brain Repo

Ensure ~/.patb/ directory exists.
If ~/.patb/{slug}.patb/.git already exists: keep it, already set up.
Otherwise: git clone {current-repo-url}.patb ~/.patb/{slug}.patb/
If clone fails (remote doesn't exist):
  Tell user to create {current-repo-url}.patb on their git host.
  Fallback: mkdir -p ~/.patb/{slug}.patb/ && git -C ~/.patb/{slug}.patb/ init


## @brain

Write {brain_root}/@brain:

````
<!-- main-brain-origin-source-url: {current-repo-url} -->
# {title derived from source README}

{short project description}

```yaml
skill_hub_url: {skill-hub-url}
follow:
  - {follow items from config}
avoid:
  - {avoid items from config}
max_notes: {max-notes}
min_rating: {min-rating}
```
````

Rules:
  - Omit empty follow/avoid lists entirely.
  - Use defaults: max_notes=64, min_rating=30.
  - If file exists + valid: preserve user content, only fill missing fields.
  - If file exists but empty/invalid: overwrite.


## @pinky

Create {source_root}/@pinky:
  Line 1: Current repo URL from configuration table
  Lines 2+: empty (user adds linked repos later)
Skip if @pinky already exists.
Skip if URL still contains {user} or {repo} placeholders.


## Always-Active Instructions

Detect the AI environment using the first matching indicator:

```
| Environment              | Detection                                            | Install path                                    | Format                         |
|--------------------------|------------------------------------------------------|-------------------------------------------------|--------------------------------|
| VS Code + GitHub Copilot | run_vscode_command tool + ~/.config/Code/ exists     | {VS Code user prompts dir}/pb.instructions.md   | applyTo: "**" frontmatter      |
| Cursor                   | ~/.cursor/ exists                                    | ~/.cursor/rules/pb-memory.mdc                   | alwaysApply: true frontmatter  |
| Windsurf                 | ~/.windsurf/ exists                                  | ~/.windsurf/rules/pb-memory.md                  | No frontmatter                 |
| Claude Code              | ~/.claude/ exists                                    | Append to ~/.claude/CLAUDE.md                   | No frontmatter                 |
| Cline / RooCode          | ~/.cline/ exists                                     | ~/.cline/rules/pb-memory.md                     | No frontmatter                 |
| Unknown                  | none matched                                         | ~/.agents/instructions/pb-memory.md             | No frontmatter; warn user      |
```

Write to the detected path (adapt frontmatter to environment):

```
# Pinky & the Brain (p&b)

You have persistent cross-project memory powered by per-project brain repos.
Active when @pinky exists at workspace root.
Invoke the `pinky-memory` skill for all memory operations.

## Quick Reference
- @brain: {brain_root}/@brain — origin URL, title, YAML config
- @pinky: {source_root}/@pinky — repo URL (line 1), linked repos (lines 2+)
- Brain repo: {repo-url}.patb → ~/.patb/{slug}.patb/
- Memory files: purpose.md, thoughts.md, tree.md, changes.md (in .patb)
- Slug: last URL path segment, strip .git, lowercase, sanitize

## Session Lifecycle
Start: sync brain → read @brain + @pinky → load memory → check linked repos
Runtime: invoke skill for remember/forget/query/list

## Commands
- "what do you know about X" → search thoughts.md + linked repos
- "remember that..." → rate + store note, commit & push
- "forget about..." → remove note, commit & push
- "list brain contents" → show all brain repos + note counts
```


## Memory Init

Create starter files if they don't exist yet:

{brain_root}/purpose.md:
```
# {slug}
{1–3 sentence description inferred from README, config, entry points}
```

{brain_root}/thoughts.md:
```
# Thoughts
<!-- scored notes are added here over time -->
```

{brain_root}/tree.md:
```
# File Tree
<!-- generated from source repository files -->
```

{brain_root}/changes.md:
```
# Changes
<!-- cross-project-relevant changes are logged here -->
```

{brain_root}/sync.md:
```
# Sync State
source_branch: main
source_head: {current-commit-hash}
indexed_at: {now-ISO8601}
```


## Cleanup

Delete this installer file from disk.
If content was pasted as a chat message (no backing file): skip this step.
Installation complete.
