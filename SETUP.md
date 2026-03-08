# Pinky & The Brain — Install or Update

This file handles both fresh installs and updates in a single flow.
Fetched and executed by the README, by the skill version check,
or manually via the @ressurect paste block.
Configuration variables come from the README's configuration table (fresh install)
or from the existing @brain file (update / ressurect).


## Pre-flight

Determine run mode:

  **INSTALL** — @pinky does NOT exist at workspace root.
    Fresh setup. All artifacts will be created from scratch.

  **UPDATE** — @pinky EXISTS at workspace root (or RESSURECT = TRUE).
    Existing setup. Read every existing artifact fully before modifying.
    Preserve all user content (thoughts.md, changes.md, tree.md, sync.md, @pinky linked repos).
    Overwrite infrastructure (skill, instructions, @brain structure — merging user YAML values).

In UPDATE mode:
  1. Read {SOURCE_ROOT}/@pinky → extract brain repo URL (line 1), linked brain repos (lines 2+)
  2. Read {BRAIN_ROOT}/@brain → extract title, description, YAML config
  3. Read {BRAIN_ROOT}/thoughts.md, tree.md, changes.md, sync.md → keep in memory
  4. Use extracted values as configuration (do NOT require the README config block)

If DRY_RUN is set to TRUE:
  Simulate every step. Do not write, delete, or modify any files.
  Report exactly what would have happened.


## Resolve Identity

Derive {SLUG} from REPO_URL:
  last path segment → strip .git → lowercase → replace non-alphanumeric (except - _) with -
If PATB_URL is set and not empty: set BRAIN_REPO_URL = {PATB_URL}
Otherwise: set BRAIN_REPO_URL = {REPO_URL}.patb
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

**INSTALL mode** — Write {BRAIN_ROOT}/@brain:

````
<!-- main-brain-origin-source-url: {REPO_URL} -->
# {TITLE}

{DESCRIPTION}

```yaml
SKILL_URL: {SKILL_URL}
PATB_URL: {PATB_URL}
FOLLOW:
  - {FOLLOW items from config}
AVOID:
  - {AVOID items from config}
MAX_NOTES: {MAX_NOTES}
MIN_RATING: {MIN_RATING}
DECAY_RATE: {DECAY_RATE}
```
````

Rules:
  - Omit PATB_URL if not set or equal to {REPO_URL}.patb (only store when it differs).
  - Omit empty FOLLOW/AVOID lists entirely.
  - Use defaults: MAX_NOTES=64, MIN_RATING=30, DECAY_RATE=1.
  - If file exists + valid: preserve user content, only fill missing fields.
  - If file exists but empty/invalid: overwrite.

**UPDATE mode** — Read existing @brain fully, then:
  - Preserve: user-edited title and description
  - Preserve: user-edited YAML values (MAX_NOTES, MIN_RATING, DECAY_RATE, FOLLOW, AVOID)
  - Update: any new required fields the template introduces (merge with defaults)
  - If file is missing or invalid: recreate using canonical format above


## @pinky

**INSTALL mode:**
  Create {SOURCE_ROOT}/@pinky:
    Line 1: Brain repo URL ({BRAIN_REPO_URL})
    Lines 2+: empty (user adds linked brain repos later)
  Skip if URL still contains {USER} or {REPO} placeholders.

**UPDATE mode:**
  Do NOT overwrite — only verify line 1 has a valid brain repo URL.
  Preserve all linked brain repo URLs on lines 2+.


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
- @pinky: {SOURCE_ROOT}/@pinky — brain repo URL (line 1), linked brain repos (lines 2+)
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

Create starter files if they don't exist yet (both modes — never overwrite existing):

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


## Index Codebase

Scan the source repository and populate/update the brain:

1. Walk {SOURCE_ROOT} file tree (respect .gitignore)
2. Update {BRAIN_ROOT}/tree.md:
   - Add new files not yet listed
   - Remove files that no longer exist
   - Update line counts
   - Estimate Access Rate and Impact ratings (1–10) based on file type, location, and size

3. Update {BRAIN_ROOT}/@brain description:
   - Summarize the project's purpose from README, package.json, or similar
   - Keep it to 1–2 sentences

4. If this is an UPDATE and {BRAIN_ROOT}/sync.md has an indexed hash:
   - Index all commits since the last indexed hash
   - Extract decisions, pitfalls, conventions, integration-impacting changes
   - Merge into thoughts.md using rating/threshold/cap rules
   - Append cross-project-relevant changes to changes.md (cap 20, newest first)
   - Update sync.md with new hash + timestamp

5. If this is a fresh INSTALL:
   - Index recent commits (last 50 or last 30 days, whichever is smaller)
   - Extract noteworthy decisions and conventions into thoughts.md
   - Update sync.md with current head hash + timestamp


## Commit & Push

```
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: {install|update} - {SLUG}"
git -C {BRAIN_ROOT} push
```


## Store Versions

Fetch the current version files from remote:
```
https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/install.version
https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/skill.version
```

Write their contents to:
  {BRAIN_ROOT}/install.version
  ~/.agents/skills/patb/skill.version

These are compared during session start to detect when an update is available.


## Cleanup

Delete this installer file from disk (if it was written as a temp file).
If content was pasted as a chat message (no backing file): skip this step.
If RESSURECT = TRUE: inform user "Resurrect complete — p&b re-installed from latest main."
If UPDATE mode: inform user "Updated to {NEW_VERSION}. Changed: {LIST_OF_UPDATED_ARTIFACTS}."
If INSTALL mode: inform user "Installation complete."
