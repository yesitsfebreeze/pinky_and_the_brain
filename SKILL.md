---
name: pinky-memory
description: 'Manage cross-repository AI memory with an @pinky file. Use when a repo has an @pinky file, to sync memory, capture decisions/pitfalls/useful notes per file, and persist summaries inside the brain repo under .brain/{slug}/{language}/... with commits. Also triggers on: "remember this", "what do you know about", decisions/pitfalls capture, memory sync requests.'
argument-hint: 'Optional: focus area or file path (e.g. "auth refactor" or "src/main.ts")'
user-invocable: true
disable-model-invocation: false
---

# Pinky Memory

## Architecture: Three Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│  AI (this skill)         │  GitHub Actions (brain repo)     │
├──────────────────────────┼──────────────────────────────────┤
│  READ  at session start  │  REBUILD index.md on every push  │
│  WRITE at session end    │  runs autonomously, no AI needed │
│  PUSH  always            │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

- **AI reads** `.brain/` at the start of every conversation to load memory context
- **AI writes** per-file notes and pushes at the **end of every conversation** — this is mandatory and automatic, not user-triggered
- **GitHub Actions** rebuilds `.brain/index.md` on every push to the brain repo — the AI never manually maintains the index
- The brain grows passively: every project conversation adds to it without any extra effort

## What This Skill Does
This skill implements a shared-brain memory workflow:
- A **brain repo** (`pinky-and-the-brain`) stores all project memory under `.brain/{slug}/`
- A **local clone** of the brain repo lives at `~/.pinky/`
- Each project has an `@pinky` marker file at its root pointing to the brain

When line 1 and line 2 of `@pinky` are the same URL, this repo **is** the brain repo — no separate clone is needed; the working directory is used directly.

It handles:
1. **[START]** Discover `@pinky`, sync brain, load memory context
2. **[START]** Search all project memory before answering anything
3. **[END]** Write per-file notes for everything touched this session
4. **[END]** Update `@pinky` touched files list
5. **[END]** Commit and push — triggers GitHub Actions to rebuild index

## MANDATORY: This Runs Every Conversation

> **The memory write phase (steps 6–9) MUST execute at the end of every conversation
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
https://github.com/yesitsfebreeze/pinky-and-the-brain   ← line 1: brain repo URL (required)
https://github.com/{user}/{source-repo}                  ← line 2: source repo URL (required)
                                                          ← if line 1 == line 2, this IS the brain repo

# interesting
https://github.com/some/related-lib                      ← repos AI should search for context
https://github.com/another/reference                     ← AI auto-appends here as it discovers relevant repos

# files
src/main.ts                                              ← touched files ranked by importance (AI-maintained)
src/auth.ts
```

Rules:
- Line 1 must be a valid git URL (the brain repo)
- Line 2 must be this repo's git origin URL
- If line 1 == line 2: this repo is the brain — work in the current directory, no clone needed
- `# interesting`: one URL per line; AI appends newly discovered related repos automatically
- `# files`: one relative path per line, ordered by importance; AI rewrites after each sync

## Required Conventions
1. Marker file is exactly `@pinky` at repo root
2. When line 1 ≠ line 2: brain repo is always cloned/kept at `~/.pinky/`
3. When line 1 == line 2: use the current working directory as the brain root
4. All memory data lives under `.brain/` inside the brain repo
5. Never store secrets, credentials, tokens, or sensitive personal data

## Procedure

### 1) Discover Context
1. Find repo root and locate `@pinky`
2. Read line 1 (brain URL) and line 2 (source URL)
3. Parse `# interesting` section (list of repo URLs)
4. Parse `# files` section (list of touched file paths)
5. Validate line 1 is a git URL

**Self-referential case**: if line 1 == line 2 (normalized, strip `.git` suffix):
- This repo is the brain. Set brain root = current working directory.
- Skip steps 2 (sync) entirely — already local.
- Slug is derived from line 2 as normal.

If `@pinky` is missing:
1. Create `@pinky` with line 1 as brain URL (ask user if unknown)
2. Fill line 2 with `git remote get-url origin`
3. Leave `# interesting` and `# files` sections empty

If line 1 is invalid or empty: stop and ask for a valid brain repo URL.

### 2) Sync Brain Repository
*Skip this step entirely if line 1 == line 2 (self-referential brain repo).*

1. Ensure `~/.pinky/` exists
2. If `~/.pinky/.git` does not exist:
   - `git clone <line-1> ~/.pinky/`
   - Install the hook: `git -C ~/.pinky config core.hooksPath .githooks`
   - The `.githooks/post-merge` script is versioned in the brain repo — this activates it
3. If `~/.pinky/.git` exists: verify remote URL matches line 1
4. `git -C ~/.pinky pull` — if new commits were merged, `post-merge` fires automatically and writes `~/.pinky/.brain/.needs-reindex`

If remote mismatch: ask whether to switch remote or use alternate directory.

**Self-referential brain repo:** the hook is already active via the repo's own `.githooks/` folder (run `git config core.hooksPath .githooks` once in the repo root if not already set).

### 3) Derive Project Slug
1. Extract last path segment from line 2 (source URL), strip `.git` suffix
   - `https://github.com/user/my-project.git` → `my-project`
   - `git@github.com:user/my-project.git` → `my-project`
2. Sanitize: lowercase, replace non-alphanumeric (except `-_`) with `-`
3. All brain files for this project: `{brain_root}/.brain/{slug}/`

### 4) Register Project (first sync only)
If `{brain_root}/.brain/{slug}/meta.md` does not exist:
1. Infer project purpose by reading: `README.md`, top-level config files, entry point files
2. Write `{brain_root}/.brain/{slug}/meta.md`:

```markdown
# {slug}

## Purpose
{1–3 sentence AI-inferred description of what this project does and why it exists}

## Source Repository
{line-2 URL}

## Brain Repository
{line-1 URL}

## First Indexed
{ISO-8601 timestamp}
```

> **Do not write or modify `.brain/index.md` manually.**
> The `post-merge` hook + `.needs-reindex` flag mechanism rebuilds it automatically.
> Reading it at session start (step 5) is fine — writing it is not the AI's job.

### 5) Check Reindex Flag & Load Memory
At the **start** of every session, before answering anything:

**5a) Check flag:**
1. If `{brain_root}/.brain/.needs-reindex` exists:
   - Run `scripts/rebuild-index.py` (or equivalent) to regenerate `{brain_root}/.brain/index.md`
   - Delete `{brain_root}/.brain/.needs-reindex`
   - Stage and commit: `git add .brain/index.md && git commit -m "pinky: rebuild index [skip reindex]"`
   - Push (silent, background — do not mention to user unless it fails)
2. If flag does not exist: skip — index is already fresh

**5b) Load memory (read-only):**
1. Read `{brain_root}/.brain/index.md` — fast overview of all known projects
2. For the **current slug**: read all relevant `{language}/{filepath}.md` notes
3. For **other slugs** that look relevant (based on index): read their `meta.md` and related file notes
4. For each URL in the `# interesting` section of `@pinky`:
   - Check if that repo has a slug folder under `.brain/`
   - If not, fetch the repo's README or public file tree for context (read-only)
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
2. Write/update: `{brain_root}/.brain/{slug}/{language}/{p}.md`

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
- Source repo: {line-2 URL}
```

Append or merge — never erase still-valid prior memory.

### 8) Update `@pinky`
Rewrite `@pinky` in place, preserving exact format:
1. Line 1: brain URL (unchanged)
2. Line 2: source URL (unchanged)
3. Blank line
4. `# interesting`: preserve existing URLs; append newly discovered related repos from this conversation
5. Blank line
6. `# files`: rewrite with all touched files sorted by importance:
   1. Architecture / core logic
   2. Security / data integrity
   3. Public API / contracts
   4. Build / test / tooling
   5. Minor docs or style-only edits

### 9) Sync Global Skill Copy
After pulling the brain repo, keep the global Copilot skill in sync:
1. If `~/.copilot/skills/pinky-memory/SKILL.md` exists and differs from `{brain_root}/SKILL.md`:
   - Copy `{brain_root}/SKILL.md` → `~/.copilot/skills/pinky-memory/SKILL.md`
   - This ensures the AI always runs the latest version of the skill
2. Skip if this is the brain repo itself (the file is already local)

### 10) Commit Memory Changes
In `{brain_root}`:
1. `git add .brain/{slug}/` — **do NOT stage `.brain/index.md`** (hook owns that file)
2. Also stage `@pinky` if it changed
3. Commit: `pinky: update {slug} ({n} files)`
4. **Push** — the remote receiver's `post-merge` hook will write `.needs-reindex` on the next pull, triggering index rebuild lazily on the next session
5. If push fails: leave local commit, report status, continue.

## Completion Checks

**Session start:**
1. `@pinky` exists with valid lines 1 and 2
2. Brain root identified (local dir or `~/.pinky/` clone)
3. Memory context loaded from `.brain/{slug}/` and `index.md`

**Session end (mandatory):**
4. `{brain_root}/.brain/{slug}/meta.md` exists
5. Memory note files written for all touched files
6. `~/.copilot/skills/pinky-memory/SKILL.md` is in sync with brain repo
7. `@pinky` `# files` section reflects ranked touched files
8. Git commit created and pushed in brain root (or explicit reason why not)
9. `post-merge` hook will handle rebuilding `index.md` on the next pull — AI does not need to verify this

## Failure Handling
1. Invalid URL on line 1 → report and ask for correction
2. Clone/pull failure → report command + error, avoid partial writes
3. Missing line 2 → run `git remote get-url origin`; use `unknown-source` if unavailable
4. Path collisions or illegal paths → sanitize and log mapping
5. Push failure (no auth, etc.) → leave local commit, report and continue
