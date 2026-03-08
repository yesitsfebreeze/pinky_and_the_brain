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

Derive {SLUG} from REPO_URL:
  last path segment → strip .git → lowercase → replace non-alphanumeric (except - _) with -
Set BRAIN_REPO_URL = {REPO_URL}.patb
Set BRAIN_ROOT = ~/.patb/{SLUG}.patb/


## Skill Bootstrap

Create directory ~/.agents/skills/patb/ if it doesn't exist.
Write the following verbatim to ~/.agents/skills/patb/SKILL.md
(overwrite if it exists):

````
---
name: patb
description: >
  Manage cross-repository AI memory with per-project brain repos ({SLUG}.patb).
  MUST be invoked automatically on the FIRST message of every session when @pinky
  exists at workspace root — do not wait for user to ask.
  Also use when a repo has @pinky and @brain files, to sync memory, capture
  decisions/pitfalls/useful notes into a rated note pool (thoughts.md), and persist
  them in the project's dedicated brain repo. Also triggers on: "remember this",
  "what do you know about", decisions/pitfalls capture, memory sync requests.
argument-hint: 'Optional: focus area or file path (e.g. "auth refactor" or "src/main.ts")'
user-invocable: true
disable-model-invocation: false
---

MANDATORY: If @pinky exists at workspace root, fetch and execute the remote skill instructions below on the VERY FIRST message of every session. Do not defer this — run the full session lifecycle (sync brain → read @brain + @pinky → load memory → check linked repos) before handling any user request.

SKILL_MODE = TRUE

FETCH and EXECUTE: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SKILL.md
````


## Brain Repo

Ensure ~/.patb/ directory exists.
If ~/.patb/{SLUG}.patb/.git already exists: keep it, already set up.
Otherwise: git clone {BRAIN_REPO_URL} ~/.patb/{SLUG}.patb/
If clone fails (remote doesn't exist):
  Ask the user: "The brain repo {BRAIN_REPO_URL} doesn't exist on your remote yet. Want me to create it locally and push it?"
  If yes:
    mkdir -p ~/.patb/{SLUG}.patb/
    git -C ~/.patb/{SLUG}.patb/ init
    git -C ~/.patb/{SLUG}.patb/ remote add origin {BRAIN_REPO_URL}
    (after @brain + memory files are written, commit and push — the remote repo will be created on first push if the host supports it, otherwise instruct the user to create the empty repo on their git host first)
  If no:
    mkdir -p ~/.patb/{SLUG}.patb/ && git -C ~/.patb/{SLUG}.patb/ init
    Skip remote setup. Brain works locally only until user adds a remote.


## @brain

Write {BRAIN_ROOT}/@brain:

````
<!-- main-brain-origin-source-url: {REPO_URL} -->
# {TITLE}

{DESCRIPTION}

```yaml
SKILL_URL: {SKILL_URL}
FOLLOW:
  - {FOLLOW items from config}
AVOID:
  - {AVOID items from config}
MAX_NOTES: {MAX_NOTES}
MIN_RATING: {MIN_RATING}
```
````

Rules:
  - Omit empty FOLLOW/AVOID lists entirely.
  - Use defaults: MAX_NOTES=64, MIN_RATING=30.
  - If file exists + valid: preserve user content, only fill missing fields.
  - If file exists but empty/invalid: overwrite.


## @pinky

Create {SOURCE_ROOT}/@pinky:
  Line 1: Current repo URL from configuration table
  Lines 2+: empty (user adds linked repos later)
Skip if @pinky already exists.
Skip if URL still contains {USER} or {REPO} placeholders.


## Always-Active Instructions

Detect the AI environment using the first matching indicator:

```
| Environment              | Detection                                        | Install path                                   | Format                        |
|--------------------------|--------------------------------------------------|------------------------------------------------|-------------------------------|
| VS Code + GitHub Copilot | run_vscode_command tool + ~/.config/Code/ exists | {VS Code user prompts dir}/pb.instructions.md  | applyTo: "**" frontmatter     |
| Cursor                   | ~/.cursor/ exists                                | ~/.cursor/rules/pb-memory.mdc                  | alwaysApply: true frontmatter |
| Windsurf                 | ~/.windsurf/ exists                              | ~/.windsurf/rules/pb-memory.md                 | No frontmatter                |
| Claude Code              | ~/.claude/ exists                                | Append to ~/.claude/CLAUDE.md                  | No frontmatter                |
| Cline / RooCode          | ~/.cline/ exists                                 | ~/.cline/rules/pb-memory.md                    | No frontmatter                |
| Unknown                  | none matched                                     | ~/.agents/instructions/pb-memory.md            | No frontmatter; warn user     |
```

Write to the detected path (adapt frontmatter to environment):

```
# Pinky & the Brain (p&b)

You have persistent cross-project memory powered by per-project brain repos.
Active when @pinky exists at workspace root.
Invoke the `patb` skill for all memory operations.

## Quick Reference
- @brain: {BRAIN_ROOT}/@brain — origin URL, title, YAML config
- @pinky: {SOURCE_ROOT}/@pinky — repo URL (line 1), linked repos (lines 2+)
- Brain repo: {REPO_URL}.patb → ~/.patb/{SLUG}.patb/
- Memory files: thoughts.md, tree.md, changes.md (in .patb)
- SLUG: last URL path segment, strip .git, lowercase, sanitize

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

{BRAIN_ROOT}/thoughts.md:
```
# Thoughts
<!-- scored notes are added here over time -->
```

{BRAIN_ROOT}/tree.md:
```
# File Tree
<!-- generated from source repository files -->
```

{BRAIN_ROOT}/changes.md:
```
# Changes
<!-- cross-project-relevant changes are logged here -->
```

{BRAIN_ROOT}/sync.md:
```
# Sync State
SOURCE_BRANCH: main
SOURCE_HEAD: {CURRENT_COMMIT_HASH}
INDEXED_AT: {NOW_ISO8601}
```


## Cleanup

Delete this installer file from disk.
If content was pasted as a chat message (no backing file): skip this step.
Installation complete.
