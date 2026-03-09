# Pinky & The Brain — Install or Update

This file handles both fresh installs and updates in a single flow.
Fetched and executed by the README, by the skill version check,
or manually via the `@resync` command.
Configuration variables come from the README's configuration table (fresh install)
or from the existing @brain file (update / @resync).


## Pre-flight

Determine run mode:

  **INSTALL** — @pinky does NOT exist at workspace root.
    Fresh setup. All artifacts will be created from scratch.

  **UPDATE** — @pinky EXISTS at workspace root (or `@resync` was invoked).
    Existing setup. Read every existing artifact fully before modifying.
    Preserve all user content (thoughts.md, changes.md, tree.md, sync.md, @pinky linked repos).
    Overwrite infrastructure (skill, instructions, @brain structure — merging user YAML values).

In UPDATE mode:
  1. Read {SOURCE_ROOT}/@pinky → extract brain repo URL (line 1), linked brain repos (lines 2+), STATUS line
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

MANDATORY: If @pinky exists at workspace root, execute the skill instructions on the VERY FIRST message of every session. Do not defer this — run the full session lifecycle (sync brain → read @brain + @pinky → load memory → check linked repos) before handling any user request.

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/SKILL.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/SKILL.md
Else if ~/.ptba/@brain/SKILL.md exists:
  READ and EXECUTE: ~/.ptba/@brain/SKILL.md
Else:
  Tell user to run @resync because local skill source is missing.
````


## Command Skills Bootstrap

For each command below:
  Create directory ~/.agents/skills/{skill-name}/ if it doesn't exist.
  Write the following content verbatim to ~/.agents/skills/{skill-name}/SKILL.md (overwrite if it exists).

---

**remember** → ~/.agents/skills/remember/SKILL.md:
````
---
name: remember
description: >
  Store a new note in the p&b brain repo for the current project.
  Use when the user says "@remember" or "remember that...".
argument-hint: 'The thing to remember, e.g. "we use snake_case for all DB column names"'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/remember.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/remember.md
Else if ~/.ptba/@brain/skills/remember.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/remember.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**forget** → ~/.agents/skills/forget/SKILL.md:
````
---
name: forget
description: >
  Remove a note from the p&b brain repo for the current project.
  Use when the user says "@forget" or "forget about...".
argument-hint: 'The note to remove, e.g. "the snake_case convention"'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/forget.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/forget.md
Else if ~/.ptba/@brain/skills/forget.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/forget.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**brain** → ~/.agents/skills/brain/SKILL.md:
````
---
name: brain
description: >
  List all p&b brain repos with note counts, or show all notes for a specific brain repo slug.
  Use when the user says "@brain" or "list brain contents".
argument-hint: 'Optional: brain repo slug to inspect (e.g. "my-project")'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/brain.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/brain.md
Else if ~/.ptba/@brain/skills/brain.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/brain.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**prune** → ~/.agents/skills/prune/SKILL.md:
````
---
name: prune
description: >
  Remove all notes below the rating threshold (PRUNE_THRESHOLD) from the current
  project's brain repo. Use when the user says "@prune".
argument-hint: 'No argument needed'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/prune.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/prune.md
Else if ~/.ptba/@brain/skills/prune.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/prune.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**commit** → ~/.agents/skills/commit/SKILL.md:
````
---
name: commit
description: >
  Group all uncommitted source changes by scope, create per-scope commits, push,
  and trigger p&b brain indexing. Use when the user says "@commit".
argument-hint: 'No argument needed'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/commit.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/commit.md
Else if ~/.ptba/@brain/skills/commit.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/commit.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**plan** → ~/.agents/skills/plan/SKILL.md:
````
---
name: plan
description: >
  Enter p&b plan mode. Each subsequent message is silently captured as a plan
  fragment into @plan above the separator. Use when the user says "@plan".
argument-hint: 'No argument needed'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/plan.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/plan.md
Else if ~/.ptba/@brain/skills/plan.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/plan.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**play** → ~/.agents/skills/play/SKILL.md:
````
---
name: play
description: >
  Exit plan mode and implement the most impactful next todo from @plan. Gathers
  context from brain notes, solves it, deletes the todo, and commits. Use when
  the user says "@play".
argument-hint: 'No argument needed'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/play.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/play.md
Else if ~/.ptba/@brain/skills/play.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/play.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**exit** → ~/.agents/skills/exit/SKILL.md:
````
---
name: exit
description: >
  Exit plan mode or play mode and return to normal conversation. Use when the user
  says "@exit".
argument-hint: 'No argument needed'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/exit.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/exit.md
Else if ~/.ptba/@brain/skills/exit.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/exit.md
Else:
  Tell user to run @resync because local skill source is missing.
````

---

**resync** → ~/.agents/skills/resync/SKILL.md:
````
---
name: resync
description: >
  Re-install p&b from latest main, preserving all user notes and linked repos.
  Use when the user says "@resync" or when the setup appears broken.
argument-hint: 'No argument needed'
user-invocable: true
disable-model-invocation: false
---

SKILL_MODE = TRUE

If {BRAIN_URL} equals {REPO_URL} and {SOURCE_ROOT}/skills/resync.md exists:
  READ and EXECUTE: {SOURCE_ROOT}/skills/resync.md
Else if ~/.ptba/@brain/skills/resync.md exists:
  READ and EXECUTE: ~/.ptba/@brain/skills/resync.md
Else:
  Tell user to run @resync because local skill source is missing.
````


## Source Clone

Set SRC_ROOT = ~/.ptba/@brain

If {BRAIN_URL} equals {REPO_URL}:
  Skip clone (workspace is the canonical source already).
Else if {SRC_ROOT}/.git does not exist:
  git clone https://github.com/yesitsfebreeze/pinky-and-the-brain {SRC_ROOT}
  If clone fails: stop and report error — skill source must be local.
Else:
  git -C {SRC_ROOT} pull --rebase --quiet

This clone provides local access to SKILL.md, CONTEXT.md, and all skill files,
eliminating network fetches for skill content on every session start.


## Global Repo Catalog

During sync, update the shared catalog in `~/.patb/pinky-and-the-brain.patb/repos.md`:

- One row per source repo using p&b
- Columns: Repo URL | Brain URL | Slug | Last Seen
- Upsert by Repo URL; refresh Last Seen on every sync

If the global brain repo clone is missing, clone it first.
If pull or push fails, continue local sync and report catalog update failure.


## MCP Server Bootstrap

Resolve {HOME}:
  Linux/macOS: run `echo $HOME`
  Windows: use `%USERPROFILE%`
  (Referred to as `{HOME}` below — always substitute the actual absolute path.)

MCP install path: `{HOME}/.agents/skills/patb/mcp/`

Check Node.js is available:
  Run: `node --version`
  If not found: warn — "p&b MCP server requires Node.js ≥18. Install from https://nodejs.org then run @resync to activate the MCP server." — set MCP_BUILD_FAILED = TRUE and skip ahead to **Brain Repo**.

Download MCP source (adapt paths for OS):
  Create `{HOME}/.agents/skills/patb/` if it doesn't exist.

  Linux/macOS:
  ```
  git clone --filter=blob:none --sparse \
    https://github.com/yesitsfebreeze/pinky-and-the-brain \
    "{HOME}/.agents/skills/patb/_mcp_src"
  git -C "{HOME}/.agents/skills/patb/_mcp_src" sparse-checkout set mcp
  cp -r "{HOME}/.agents/skills/patb/_mcp_src/mcp/." "{HOME}/.agents/skills/patb/mcp/"
  rm -rf "{HOME}/.agents/skills/patb/_mcp_src"
  ```

  Windows (PowerShell):
  ```powershell
  git clone --filter=blob:none --sparse `
    https://github.com/yesitsfebreeze/pinky-and-the-brain `
    "$env:USERPROFILE\.agents\skills\patb\_mcp_src"
  git -C "$env:USERPROFILE\.agents\skills\patb\_mcp_src" sparse-checkout set mcp
  Copy-Item -Recurse -Force "$env:USERPROFILE\.agents\skills\patb\_mcp_src\mcp\*" `
    "$env:USERPROFILE\.agents\skills\patb\mcp\"
  Remove-Item -Recurse -Force "$env:USERPROFILE\.agents\skills\patb\_mcp_src"
  ```

Build the server:
  Linux/macOS: `npm install --prefix "{HOME}/.agents/skills/patb/mcp" && npm run build --prefix "{HOME}/.agents/skills/patb/mcp"`
  Windows: `npm install --prefix "%USERPROFILE%\.agents\skills\patb\mcp" && npm run build --prefix "%USERPROFILE%\.agents\skills\patb\mcp"`
  If build fails: print the error, set MCP_BUILD_FAILED = TRUE, warn user "MCP server build failed — run @resync after fixing Node.js setup", and continue.


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


## {BRAIN_ROOT}/@brain

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
PRUNE_THRESHOLD: {PRUNE_THRESHOLD}
HIBERNATION_DAYS: {HIBERNATION_DAYS}  # freeze decay after this many days idle (default: 90, 0 = disabled)
MAX_CONTEXT_NOTES: {MAX_CONTEXT_NOTES}  # max notes loaded into prompt (default: 8)
MAX_CONTEXT_FILES: {MAX_CONTEXT_FILES}  # max tree.md entries surfaced (default: 5)
MAX_LINKED_REPOS: {MAX_LINKED_REPOS}   # max linked repos queried (default: 3)
CONTEXT_DEPTH: {CONTEXT_DEPTH}          # max concept link hops, Phase 3 only (default: 2)
```
````

Rules:
  - Omit PATB_URL if not set or equal to {REPO_URL}.patb (only store when it differs).
  - Omit empty FOLLOW/AVOID lists entirely.
  - Use defaults: MAX_NOTES=64, MIN_RATING=300, DECAY_RATE=1, PRUNE_THRESHOLD=MIN_RATING, HIBERNATION_DAYS=90, MAX_CONTEXT_NOTES=8, MAX_CONTEXT_FILES=5, MAX_LINKED_REPOS=3, CONTEXT_DEPTH=2.
  - If file exists + valid: preserve user content, only fill missing fields.
  - If file exists but empty/invalid: overwrite.

**UPDATE mode** — Read existing @brain fully, then:
  - Preserve: user-edited title and description
  - Preserve: user-edited YAML values (MAX_NOTES, MIN_RATING, DECAY_RATE, PRUNE_THRESHOLD, HIBERNATION_DAYS, FOLLOW, AVOID)
  - Update: any new required fields the template introduces (merge with defaults)
  - If file is missing or invalid: recreate using canonical format above


## {SOURCE_ROOT}/@pinky

**INSTALL mode:**
  Create {SOURCE_ROOT}/@pinky:
    Line 1: Brain repo URL ({BRAIN_REPO_URL})
    Lines 2+: empty (user adds linked brain repos later)
  Skip if URL still contains {USER} or {REPO} placeholders.

**UPDATE mode:**
  Do NOT overwrite — only verify line 1 has a valid brain repo URL.
  Preserve all linked brain repo URLs on lines 2+.
  Preserve any existing `STATUS: ...` line.


## {SOURCE_ROOT}/@plan

**INSTALL mode:**
  If {SOURCE_ROOT}/@plan does not exist:
    Create {SOURCE_ROOT}/@plan with this starter template:

````
█████████████████████
````

    The line above divides the file: raw ideas go above it; AI-generated actionable todos go below it.

**UPDATE mode:**
  If {SOURCE_ROOT}/@plan does not exist: create using the INSTALL template above.
  If it exists: do NOT modify — user content is preserved.


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
- @pinky: {SOURCE_ROOT}/@pinky — brain repo URL (line 1), linked repos (lines 2+), STATUS line
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


## MCP Registration

Skip if MCP_BUILD_FAILED is TRUE.

MCP server path (use actual resolved {HOME}, not `~`):
  `{HOME}/.agents/skills/patb/mcp/dist/index.js`

Using the environment detected in **Always-Active Instructions**, write or merge the `patb` entry:

| Environment              | Config file                                           | Merge key                 |
|--------------------------|-------------------------------------------------------|---------------------------|
| VS Code + GitHub Copilot | `{SOURCE_ROOT}/.vscode/mcp.json`                      | `servers`                 |
| Cursor                   | `{HOME}/.cursor/mcp.json`                             | `mcpServers`              |
| Windsurf                 | `{HOME}/.codeium/windsurf/mcp_config.json`            | `mcpServers`              |
| Claude Code              | `{SOURCE_ROOT}/.mcp.json`                             | `mcpServers`              |
| Cline / RooCode          | VS Code user `settings.json` → key `cline.mcpServers` | (nested)                  |
| Unknown                  | Print manual setup instructions                       | —                         |

Merge rule: read the JSON file (treat missing as `{}`). Add or replace the `patb` key under the merge key. Write back.

**VS Code entry** (under `servers` in `.vscode/mcp.json`):
```json
"patb": {
  "type": "stdio",
  "command": "node",
  "args": ["{HOME}/.agents/skills/patb/mcp/dist/index.js"],
  "env": { "PATB_SOURCE_ROOT": "${workspaceFolder}" }
}
```

**All other environments** (under `mcpServers`):
```json
"patb": {
  "command": "node",
  "args": ["{HOME}/.agents/skills/patb/mcp/dist/index.js"]
}
```

**Cline / RooCode** — VS Code user `settings.json` paths:
  Linux:   `~/.config/Code/User/settings.json`
  macOS:   `~/Library/Application Support/Code/User/settings.json`
  Windows: `%APPDATA%\Code\User\settings.json`
  Merge `patb` into `cline.mcpServers` (same entry format as `mcpServers` above).

**Unknown environment** — print:
```
To activate the p&b MCP server, add it to your MCP configuration:
  name:    patb
  command: node
  args:    {HOME}/.agents/skills/patb/mcp/dist/index.js
Restart your IDE after adding it.
```

After registering:
  VS Code: run `workbench.action.reloadWindow` if available; otherwise prompt: "Reload the VS Code window to activate the p&b MCP server (Ctrl+Shift+P → Reload Window)."
  Other IDEs: prompt user to restart or reload to activate the MCP server.


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

{BRAIN_ROOT}/concepts.md:
```
# Concepts
<!-- auto-generated from concept tags in thoughts.md — do not manually edit -->
```


## Migrate Notes

**UPDATE mode only.** Runs after Memory Init, before Index Codebase.

Read {BRAIN_ROOT}/thoughts.md and detect notes using the old format —
i.e. the metadata comment is missing one or more of: `created`, `last_used`.

Pattern for old-format notes:
  `<!-- rating: {N} -->` (no `created` or `last_used` fields present)

For each old-format note:
  1. Determine a fallback date:
       Run: `git -C {SOURCE_ROOT} log --follow --diff-filter=A --format=%cs -- thoughts.md | head -1`
       If output is empty or command fails: use today's date (ISO 8601: YYYY-MM-DD)
       This date is used as both `created` and `last_used`.
  2. Rewrite the metadata comment in-place:
       Old: `<!-- rating: {N} -->`
       New: `<!-- rating: {N} | created: {DATE} | last_used: {DATE} -->`
       Preserve `concepts` field if it already exists; omit if not present (tag organically later).
  3. Do NOT add a `<!-- sources: ... -->` line unless sources were already present in the note.
  4. Do NOT alter the note title or body.

If no old-format notes are found: skip silently.
If any notes were migrated: log the count in changes.md:
  `#### {TODAY} — migrated {N} note(s) to current format`


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


## Store Version

Read local file: `~/.ptba/@brain/version`

Write its contents to: `~/.agents/skills/patb/version`

This is compared before each skill run to detect when an update is available.


## MCP Build

If `node` and `npm` are available:

  Step 1 — Fetch MCP source into install location:

  ```
  git clone --depth=1 https://github.com/yesitsfebreeze/pinky-and-the-brain /tmp/patb-mcp-src
  cp -r /tmp/patb-mcp-src/mcp ~/.agents/skills/patb/mcp
  rm -rf /tmp/patb-mcp-src
  ```

  In UPDATE mode: overwrite existing source (node_modules preserved for faster rebuild).
  On Windows: use system temp dir instead of /tmp; use `xcopy /E /I /Y` or `robocopy` for copy.

  Step 2 — Build:

  ```
  cd ~/.agents/skills/patb/mcp && npm install && npm run build
  ```

  Step 3 — Write `.vscode/mcp.json` to {SOURCE_ROOT}/.vscode/mcp.json if it does not already exist:

  **Unix / macOS:**
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

  **Windows:**
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

  Do NOT overwrite an existing `.vscode/mcp.json` — user may have customised it.

  If build fails: warn user — markdown-direct fallback remains active.

If `node` / `npm` are not available: skip this section silently.


## Cleanup

Delete this installer file from disk (if it was written as a temp file).
If content was pasted as a chat message (no backing file): skip this step.
If `@resync` was invoked: inform user "@resync complete — p&b re-installed from latest main."
If UPDATE mode: inform user "Updated to {NEW_VERSION}. Changed: {LIST_OF_UPDATED_ARTIFACTS}."
If INSTALL mode: inform user "Installation complete."
