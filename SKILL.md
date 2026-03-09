# Pinky & The Brain — Skill

## Version Check

Read local version file: `~/.ptba/@brain/version`

Compare line 1 (version string) to local `~/.agents/skills/patb/version`.
If local file is missing or version differs: run @resync, then continue.
If versions match: continue with normal session lifecycle.


## Load Context

READ: `~/.ptba/@brain/CONTEXT.md`

Mandatory startup checklist (before any tool calls):
  1. Find `@pinky` in `SOURCE_ROOT` (workspace repo root)
  2. Map brain repo URL (line 1 of `@pinky`) to `BRAIN_ROOT` under `~/.patb/{SLUG}.patb/`
  3. Do not look for `@brain` in the workspace root

Resolve identity and set {SLUG}, BRAIN_ROOT, SOURCE_ROOT per CONTEXT.md.


## Sync Brain Repo

If ~/.patb/{SLUG}.patb/.git does not exist:
  git clone {BRAIN_REPO_URL} ~/.patb/{SLUG}.patb/
  If clone fails (remote doesn't exist):
    Ask the user: "The brain repo {BRAIN_REPO_URL} doesn't exist on your remote yet. Want me to create it locally and push it?"
    If yes: init local repo, add remote, commit all memory files, push
    If no: init local repo without remote, brain works locally only
If it exists:
  Verify remote matches expected URL
  Check for uncommitted changes: `git -C {BRAIN_ROOT} status --porcelain`
  If changes: git add -A && commit "pb: update ({N} notes)" → pull --rebase → push
  If clean: `git -C {BRAIN_ROOT} pull --rebase`
If working inside a .patb repo directly: use cwd as brain root, skip clone/pull


## @brain

Read {BRAIN_ROOT}/@brain:
  Parse `main-brain-origin-source-url` from the HTML comment
  Parse YAML per CONTEXT.md (variables and defaults)
  If PATB_URL is set: override BRAIN_REPO_URL with its value
  Apply FOLLOW/AVOID as session constraints

If @brain is missing or invalid (empty, no origin comment, no YAML):
  Create/repair using canonical format:

````
<!-- main-brain-origin-source-url: {URL} -->
# {TITLE}

{DESCRIPTION}

```yaml
SKILL_URL: {URL}
PATB_URL: {URL}  # only include when brain repo URL differs from {REPO_URL}.patb
FOLLOW:
  - {CONSTRAINT}
AVOID:
  - {CONSTRAINT}
MAX_NOTES: {N}
MIN_RATING: {N}
PRUNE_THRESHOLD: {N}  # minimum rating to survive prune pass (default: same as MIN_RATING)
MAX_CONTEXT_NOTES: {N}  # max notes loaded into prompt (default: 8)
MAX_CONTEXT_FILES: {N}  # max tree.md entries surfaced (default: 5)
MAX_LINKED_REPOS: {N}   # max linked repos queried (default: 3)
CONTEXT_DEPTH: {N}      # max concept link hops, Phase 3 only (default: 2)
```
````


## @pinky

Read {SOURCE_ROOT}/@pinky:
  Public `.patb` repo links only
  Line 1: this project's own brain repo URL ({SLUG}.patb) (always itself)
  Lines 2+: linked brain repo URLs (only lines starting with `http` or `git@`)
  STATUS line: a line matching `STATUS: {mode}` — restore saved mode on session start:
    - `STATUS: plan` → set PLAN_MODE = TRUE; notify user: "Resuming plan mode."
    - `STATUS: play` → set PLAY_MODE = TRUE; notify user: "Resuming play mode."
    - Absent or `STATUS: idle` → no mode active
If missing: create with brain repo URL on line 1 (derived from `git remote get-url origin` + .patb suffix, or PATB_URL if set).

STATUS line helpers (used by mode commands below):
  WRITE STATUS {mode}: read @pinky, update or append `STATUS: {mode}`, save.
  CLEAR STATUS:        read @pinky, remove any `STATUS: ...` line, save.


## Load Memory

Read {BRAIN_ROOT}/thoughts.md — rated note pool
Read {BRAIN_ROOT}/tree.md — file tree with impact ratings

If any memory file is missing (first sync / register):
  Write thoughts.md (empty pool)
  Write tree.md (empty)
  Write changes.md (empty)
  Write sync.md with current source head

Prune pass (run after load):
  MCP FAST PATH: If `mcp_patb_prune` tool is available: call `mcp_patb_prune()` and skip the manual steps below.
  Collect all notes where `rating < PRUNE_THRESHOLD` (PRUNE_THRESHOLD from @brain YAML, default MIN_RATING)
  If any exist:
    Remove those notes from thoughts.md
    Append to {BRAIN_ROOT}/changes.md: `#### {DATE} — pruned {N} stale notes`
    Commit and push immediately:

```
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} commit -m "pb: prune {N} stale notes"
git -C {BRAIN_ROOT} push
```

Selection pass — startup path (run after prune pass; applies only when no explicit user query is active):
  Prune always operates on the FULL pool.
  Only a ranked subset is loaded into the session context.
  Relevance formula per CONTEXT.md — used for both context selection and pool eviction.
  Sort notes by relevance descending.
  Load the top MAX_CONTEXT_NOTES notes into session context (default: 8).
  Notes not selected are not loaded into the prompt but remain in the pool for future prune.
  For explicit topic queries, the full pool is used instead — see Commands → "what do you know about X".

  tree.md selection (run in same pass):
    Sort all tree.md rows by Impact score (column 4) descending.
    Surface only the top MAX_CONTEXT_FILES rows into session context (default: 5).
    Remaining rows stay on disk; not loaded into the prompt.


## Catch-Up

Determine default branches: prefer main, fallback master (for both repos)

```
git -C {SOURCE_ROOT} fetch origin --prune
git -C {BRAIN_ROOT} fetch origin --prune
```

If brain local is behind origin: pull --rebase first
Read source head hash/timestamp from origin/{SOURCE_BRANCH}
Read indexed hash/timestamp from {BRAIN_ROOT}/sync.md (create if missing)
If source is newer than indexed:
  Index all commits since indexed hash into thoughts.md, tree.md, changes.md
  Auto-tag each new note with 1–3 concept tags; add `concepts` field to its metadata comment
  Rebuild concepts.md from all concept tags in thoughts.md
  Update sync.md with new hash + timestamp
  Commit and push brain immediately


## Cross-Project Context

Collect linked public .patb URLs from @pinky: lines 2+ starting with `http` or `git@` (skip line 1, STATUS, and other non-URL lines).

For each linked repo (before ranking):
  Check for local clone at ~/.patb/{LINK_SLUG}.patb/
  If present: read @brain (title + description = project purpose)
  If not present: fetch @brain via raw URL:

```
GitHub:  https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/@brain
GitLab:  https://gitlab.com/{OWNER}/{REPO}/-/raw/{BRANCH}/@brain
Other:   use host's raw endpoint for {DEFAULT_BRANCH}
```

  Default branch detection: git symbolic-ref, or try main then master

Rank linked repos by combined score (descending):
  1. Recency score: based on date of most recent entry in changes.md
       days_since = (today - last_changes_entry_date).days
       recency_score = max(0, 30 - days_since)
       If changes.md is missing or empty: recency_score = 0
  2. Context overlap score: count of keywords shared between the repo's
     @brain description + last 7 days of changes.md entries and current session context
     (active file names, symbols, imports, user's topic)

  combined_score = recency_score + context_overlap_score
  Sort repos by combined_score descending.
  Take the top MAX_LINKED_REPOS (default: 3). Discard the rest.

For each selected linked repo:
  Read changes.md — surface entries from last 7 days or since last pull
  If project is relevant to current session: sub-search thoughts.md
  If not relevant: skip to next
  Surface at most 3 notes from that repo (highest relevance(), see Load Memory → Selection pass)
  Surface useful cross-project context and recent changes


## Context Assembly

After completing Load Memory and Cross-Project Context passes, assemble the selected data into session context:

1. **Notes block** — all selected notes, up to MAX_CONTEXT_NOTES total (local + cross-project combined):
   For each note: include title, body, rating, and concepts tags; omit sources and related-notes lines.
   Group: local repo notes first, cross-project notes after (labeled with brain repo slug).

2. **File tree** — selected tree.md rows, up to MAX_CONTEXT_FILES:
   Present as a compact table with columns: File | Impact | Notes. Omit Access Rate and Line Count.

3. **Recent cross-project changes** — surface changes.md entries from the last 7 days for each selected linked repo:
   Present as a bulleted list, one line per entry, labeled with repo slug.

Context size limits (sourced from @brain YAML; enforce silently by truncating lower-ranked items):
  MAX_CONTEXT_NOTES   — hard cap: total notes in session (locals + all cross-project combined)
  MAX_CONTEXT_FILES   — hard cap: tree.md rows surfaced
  MAX_LINKED_REPOS    — hard cap: linked repos queried


## Commands

Each command below can also be invoked as a dedicated `/` skill (e.g. `/remember`,
`/forget`, `/brain`, `/prune`, `/commit`, `/plan`, `/play`,
`/exit`, `/resync`). These individual skill files are installed by SETUP.md
under `~/.agents/skills/{cmd}/` and delegate to `skills/{cmd}.md` in this repo.


### Context loading — two paths

STARTUP PATH (session start, no active query):
  Use the selection pass in Load Memory above.
  General relevance ranking; capped at MAX_CONTEXT_NOTES.

QUERY PATH (explicit "what do you know about X"):
  Searches and ranks the FULL surviving note pool (after prune).
  MAX_CONTEXT_NOTES applied as a cap after ranking (not during search).
  See command details below.

---

### "what do you know about X"

MCP FAST PATH: If `mcp_patb_query` tool is available:
  Call: `mcp_patb_query(X, CONTEXT_DEPTH)`
  Present the returned notes concisely; cite which brain repo each came from. Done — skip the manual steps below.

QUERY PATH — full-pool concept-aware topic search:
  1. Read {BRAIN_ROOT}/@brain, the FULL thoughts.md pool, and concepts.md.
     Do NOT apply MAX_CONTEXT_NOTES during scoring — apply after ranking (step 6).
  2. Concept match pass (runs before text scoring):
       matched_concepts = {} (concept tag → hop depth)
       For each concept in concepts.md:
         if concept tag matches X (substring / fuzzy): add to matched_concepts at depth 0
       BFS expansion up to CONTEXT_DEPTH hops:
         While frontier non-empty and depth < CONTEXT_DEPTH:
           For each concept in frontier:
             Read its `related` field from concepts.md
             For each related tag not yet in matched_concepts: add at current depth + 1
       concept_match = matched_concepts is non-empty
  3. Score each note for topic relevance:
       topic_score = 0
       if concept_match:
         for each concept tag in note's `concepts` field:
           if tag in matched_concepts: topic_score += max(10, 40 - matched_concepts[tag] * 10)
       if note title or body matches X (substring / fuzzy): topic_score += 40
       if note sources match files related to X:            topic_score += 20
       combined = rating + topic_score
  4. Sort by combined score descending.
     If concept_match: surface notes with topic_score > 0 (concept or text hits).
     If no concept_match: surface notes with title/body/source text match only.
     If no match at all: fall back to startup-path ranking (top MAX_CONTEXT_NOTES).
  5. For each linked .patb in @pinky:
     Read @brain — skip if project not relevant to query.
     If relevant: sub-search that repo's FULL thoughts.md and concepts.md using the same scoring.
  6. Cap total surfaced notes at MAX_CONTEXT_NOTES (ranked by combined score, across all repos).
     For each surfaced note with a `related-notes` field: if any referenced notes exist in the pool
     and are not yet selected, include them in the output (still subject to MAX_CONTEXT_NOTES cap).
  7. Present findings concisely — cite which brain repo each came from.
     If concepts were matched: list matched concept tags and hop depth per tag.

### "@brain"

READ and EXECUTE: `~/.ptba/@brain/skills/brain.md`

### "@remember <that...>"

READ and EXECUTE: `~/.ptba/@brain/skills/remember.md`

### "@forget <about...>"

READ and EXECUTE: `~/.ptba/@brain/skills/forget.md`

### "@prune"

READ and EXECUTE: `~/.ptba/@brain/skills/prune.md`


### "@play"

READ and EXECUTE: `~/.ptba/@brain/skills/play.md`


### "@plan" / "@exit"

READ and EXECUTE: `~/.ptba/@brain/skills/plan.md`


### "@exit"

READ and EXECUTE: `~/.ptba/@brain/skills/exit.md`


### "@resync"

READ and EXECUTE: `~/.ptba/@brain/skills/resync.md`


### "@commit"

READ and EXECUTE: `~/.ptba/@brain/skills/commit.md`


## After Reasoning

Mandatory — run after answering a user query that loaded notes from thoughts.md:

  1. Scan which notes from the loaded pool were actually referenced in reasoning
  2. Apply score adjustments per CONTEXT.md.
  3. Clamp to 0–1000; remove notes below MIN_RATING; update `last_used` for notes with positive adjustments.
  4. Re-sort thoughts.md by rating (highest first)
  5. Commit adjusted ratings:

```
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: adjust ratings after reasoning"
git -C {BRAIN_ROOT} push
```


## Post-Push

Mandatory — run immediately after successful source git push:

  1. Fetch both repos:
```
git -C {SOURCE_ROOT} fetch origin --prune
git -C {BRAIN_ROOT} fetch origin --prune
```
  2. Resolve branches: main if present, else master (each repo)
  3. If brain behind origin/{BRAIN_BRANCH}: pull --rebase
  4. Compare source tip hash vs {BRAIN_ROOT}/sync.md indexed hash
     If source tip is not newer: stop (nothing to index)
  5. Index new commits since last indexed hash:
     Extract decisions, pitfalls, conventions, integration-impacting changes
     Merge into thoughts.md with rating/threshold/cap rules
     Auto-tag each new note with 1–3 concept tags; add `concepts` field to its metadata comment
     Refresh @brain description and tree.md from current source state
     Append cross-project-relevant changes to changes.md (cap 20, newest first)
     Rebuild concepts.md from all concept tags in thoughts.md
  6. Update {BRAIN_ROOT}/sync.md:
```
SOURCE_BRANCH: {MAIN|MASTER}
SOURCE_HEAD: {NEW_HASH}
INDEXED_AT: {NOW_ISO8601}
```
  7. Commit and push:
```
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: index source push - {SUMMARY}"
git -C {BRAIN_ROOT} push
```


## Note Pool Rules

Note format, score adjustments, relevance formula, and config defaults per CONTEXT.md.

When pool reaches MAX_NOTES:
  Similar note exists? → merge & replace (keep higher rating of the two).
  New note relevance > lowest existing relevance? → evict that note, insert new.
  New note relevance ≤ all existing → reject (inform user).



