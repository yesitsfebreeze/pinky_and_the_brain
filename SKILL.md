---
name: pinky-memory
description: 'Manage cross-repository AI memory with per-project brain repos ({slug}.brain). Use when a repo has an @pinky file, to sync memory, capture decisions/pitfalls/useful notes per file, and persist them in the project''s dedicated brain repo. Also triggers on: "remember this", "what do you know about", decisions/pitfalls capture, memory sync requests.'
argument-hint: 'Optional: focus area or file path (e.g. "auth refactor" or "src/main.ts")'
user-invocable: true
disable-model-invocation: false
---

# Pinky Memory

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Each project gets its own {slug}.brain git repo                  │
│                                                                    │
│  my-project/                    my-project.brain/                  │
│    @pinky  ──────────────────►    meta.md                          │
│    src/                           notes.md                         │
│    ...                            typescript/                      │
│                                     src/main.ts.md                 │
│                                     src/auth.ts.md                 │
│                                                                    │
│  pinky-and-the-brain/           (skill hub — no brain data)        │
│    SKILL.md                                                        │
│    brain.agent.md                                                  │
│    pinky.agent.md                                                  │
│    scripts/                                                        │
└────────────────────────────────────────────────────────────────────┘
```

- **One brain repo per project**: each project's memory lives in a dedicated `{slug}.brain` git repo
- **AI reads** the brain repo at session start to load memory context
- **AI writes** per-file notes and pushes at the **end of every conversation** — mandatory and automatic
- **Cross-project context** via `@links` in `@pinky` — the AI reads linked brain repos for related knowledge
- The brain grows passively: every project conversation adds to it without any extra effort

## What This Skill Does
This skill implements a distributed-brain memory workflow:
- Each project has a **dedicated brain repo** (`{slug}.brain`) storing all its memory
- **Local clones** of brain repos live under `~/.pinky/{slug}.brain/`
- Each project has an `@pinky` marker file at its root pointing to its brain repo
- The **skill hub** (`pinky-and-the-brain`) distributes this skill and the agents — it stores no brain data itself

It handles:
1. **[START]** Discover `@pinky`, sync brain repo, load memory context
2. **[START]** Read linked brain repos for cross-project context
3. **[END]** Write per-file notes for everything touched this session
4. **[END]** Commit and push to the brain repo

## MANDATORY: This Runs Every Conversation

> **The memory write phase MUST execute at the end of every conversation
> where `@pinky` is present. It is not optional. It is not user-triggered.
> It does not require the user to say "remember this".
> The AI must do it automatically before ending the session.**

The brain gets better with every conversation. Skipping the write phase defeats the entire system.

## Trigger Conditions
This skill activates automatically when:
- `@pinky` is present in the repo root — **always active, every conversation**
- The user says "remember this", "store this", "what do you know about X" — **immediate write**
- Memory sync is explicitly requested — **immediate write + push**

## `@pinky` File Format

```
https://github.com/{user}/{slug}.brain           ← line 1: brain repo URL (required)
                                                   ← must be a dedicated {slug}.brain repo
@links
https://github.com/{user}/other-project.brain    ← other brain repos to cross-reference
https://github.com/{user}/some-lib               ← interesting related repos
```

Rules:
- Line 1 must be a valid git URL pointing to this project's `.brain` repo
- `@links`: one URL per line; AI appends newly discovered related repos automatically
- Source repo URL is derived from `git remote get-url origin` (not stored in `@pinky`)
- The skill hub URL (`pinky-and-the-brain`) is never line 1 — it doesn't store brain data

## Required Conventions
1. Marker file is exactly `@pinky` at repo root
2. Brain repos follow the naming convention `{slug}.brain`
3. Brain repos are cloned to `~/.pinky/{slug}.brain/`
4. Memory data lives at the **root** of the brain repo (no `.brain/` subdirectory)
5. Never store secrets, credentials, tokens, or sensitive personal data

## Brain Repo Structure

Each `{slug}.brain` repository has this flat structure at its root:

```
meta.md                           ← project metadata, purpose, URLs
notes.md                          ← general project notes (date-grouped)
{language}/                       ← per-file notes grouped by language
  {path/to/file}.md              ← decisions, pitfalls, useful facts
```

No slug subdirectories — the repo itself IS the project's brain.

## Procedure

### 1) Discover Context
1. Find repo root and locate `@pinky`
2. Read line 1 (brain repo URL)
3. Derive source repo URL from `git remote get-url origin`
4. Parse `@links` section (list of repo URLs)
5. Validate line 1 is a valid git URL ending in `.brain` (or `.brain.git`)

If `@pinky` is missing:
1. Derive slug from `git remote get-url origin`
2. Construct brain URL: same owner/host, repo name = `{slug}.brain`
3. Create `@pinky` with the brain URL on line 1
4. Leave `@links` section empty

If line 1 is invalid or empty: stop and ask for a valid brain repo URL.

### 2) Sync Brain Repository
1. Derive `{slug}` from the brain repo URL (strip `.brain` and `.git` suffixes from last path segment)
2. Set clone path: `~/.pinky/{slug}.brain/`
3. If `~/.pinky/{slug}.brain/.git` does not exist:
   - `git clone <line-1> ~/.pinky/{slug}.brain/`
4. If it exists: verify remote URL matches line 1
5. `git -C ~/.pinky/{slug}.brain/ pull`

If remote mismatch: ask whether to switch remote or reclone.

**When working inside the brain repo itself** (current directory is a `.brain` repo):
- Use the current working directory as the brain root
- Skip clone/pull — already local

### 3) Derive Project Slug
1. Extract last path segment from brain repo URL, strip `.brain` and `.git` suffixes
   - `https://github.com/user/my-project.brain` → `my-project`
   - `git@github.com:user/zilo.brain.git` → `zilo`
2. Sanitize: lowercase, replace non-alphanumeric (except `-_`) with `-`
3. Brain root: `~/.pinky/{slug}.brain/`

### 4) Register Project (first sync only)
If `{brain_root}/meta.md` does not exist:
1. Infer project purpose by reading: `README.md`, top-level config files, entry point files
2. Write `{brain_root}/meta.md`:

```markdown
# {slug}

## Purpose
{1–3 sentence AI-inferred description of what this project does and why it exists}

## Source Repository
{source URL from git remote}

## Brain Repository
{line-1 URL}

## First Indexed
{ISO-8601 timestamp}
```

### 5) Load Memory
At the **start** of every session, before answering anything:

1. Read `{brain_root}/meta.md` — project overview
2. Read `{brain_root}/notes.md` — general project notes
3. Read all relevant `{language}/{filepath}.md` notes in the brain repo
4. For each URL in `@links`:
   - If it's a `.brain` repo: check for a local clone at `~/.pinky/{link-slug}.brain/`
   - If cloned: read its `meta.md` and any relevant file notes for cross-project context
   - If not cloned: optionally clone it (read-only) or skip
5. Surface any useful cross-project context before responding

No further writes happen until end-of-session.

---
## END-OF-SESSION: Mandatory Write Phase

> Everything below MUST run at the end of every conversation.
> No user prompt required. No exceptions.

### 6) Capture High-Signal Memory
For each request/response cycle, extract only durable high-value items:
1. Key decisions and why they were made
2. Pitfalls, regressions, constraints discovered
3. Useful implementation facts or conventions for future work

Do not store:
1. Secrets, credentials, tokens, private keys
2. Transient logs or low-signal chatter
3. Personal or sensitive data

### 7) Write Per-File Memory Notes
For each touched file path `<p>`:
1. Infer `{language}` from extension:
   - `.ts`, `.tsx` → `typescript` | `.js`, `.jsx` → `javascript` | `.py` → `python`
   - `.rb` → `ruby` | `.go` → `go` | `.rs` → `rust` | `.md` → `markdown` | other → `misc`
2. Write/update: `{brain_root}/{language}/{p}.md`

Template:
```markdown
# {p}

## Purpose
{What this file does and why it exists}

## Key Decisions
- ...

## Pitfalls
- ...

## Useful Facts
- ...

## Last Updated
- {ISO-8601 timestamp}
- Source repo: {source URL}
```

Append or merge — never erase still-valid prior memory.

### 8) Update `@pinky`
Rewrite `@pinky` in place, preserving exact format:
1. Line 1: brain repo URL (unchanged)
2. Blank line
3. `@links`: preserve existing URLs; append newly discovered related repos from this conversation

### 9) Sync Global Skill Copy
After pulling the skill hub repo, keep the global Copilot skill in sync:
1. If `~/.agents/skills/pinky-memory/SKILL.md` exists and differs from the hub's `SKILL.md`:
   - Copy hub's `SKILL.md` → `~/.agents/skills/pinky-memory/SKILL.md`
   - This ensures the AI always runs the latest version of the skill
2. The hub repo URL can be found in the `@brain` file at the project root, or defaults to `https://github.com/yesitsfebreeze/pinky-and-the-brain`

### 10) Commit Memory Changes
In `{brain_root}` (the cloned brain repo):
1. `git add -A` — stage all changes in the brain repo
2. Commit: `pinky: update ({n} files)`
3. **Push**
4. Also stage and commit `@pinky` in the **source repo** if it changed
5. If push fails: leave local commit, report status, continue.

## Completion Checks

**Session start:**
1. `@pinky` exists with valid line 1 (brain repo URL)
2. Brain repo cloned/synced at `~/.pinky/{slug}.brain/`
3. Memory context loaded from brain repo

**Session end (mandatory):**
4. `{brain_root}/meta.md` exists
5. Memory note files written for all touched files
6. `~/.agents/skills/pinky-memory/SKILL.md` is in sync with skill hub
7. `@pinky` `@links` section up to date
8. Git commit created and pushed in brain repo (or explicit reason why not)

## Failure Handling
1. Invalid URL on line 1 → report and ask for correction
2. Clone/pull failure → report command + error, avoid partial writes
3. Brain repo doesn't exist yet → guide user to create `{slug}.brain` repo on their host
4. Path collisions or illegal paths → sanitize and log mapping
5. Push failure (no auth, etc.) → leave local commit, report and continue
