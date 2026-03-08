# Pinky & The Brain — Skill

## Version Check

Fetch the remote version files:
```
https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/install.version
https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/skill.version
```

Compare line 2 (timestamp) of each against the local copies:
  {BRAIN_ROOT}/install.version
  ~/.agents/skills/patb/skill.version

If either local file is missing: treat as outdated.
If any remote timestamp is newer than local:
  Inform the user: "p&b update available ({COMPONENT} {LOCAL_VERSION} → {REMOTE_VERSION})."
  Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SETUP.md
  (This runs in UPDATE mode automatically since @pinky already exists.)

If versions match: continue with normal session lifecycle.


## Configuration

Read configuration from {BRAIN_ROOT}/@brain:
  - Parse `main-brain-origin-source-url` from the HTML comment
  - Parse YAML: SKILL_URL, PATB_URL, FOLLOW, AVOID, MAX_NOTES, MIN_RATING, PRUNE_THRESHOLD, MAX_CONTEXT_NOTES, MAX_CONTEXT_FILES, MAX_LINKED_REPOS, CONTEXT_DEPTH
  - If PATB_URL is set: override BRAIN_REPO_URL with its value
  - Apply FOLLOW/AVOID as session constraints
  - Defaults if missing: MAX_NOTES=64, MIN_RATING=30, PRUNE_THRESHOLD=MIN_RATING, MAX_CONTEXT_NOTES=8, MAX_CONTEXT_FILES=5, MAX_LINKED_REPOS=3, CONTEXT_DEPTH=2


## Resolve Identity

Determine source repo URL: `git remote get-url origin`
Derive {SLUG}: last path segment → strip .git → lowercase → sanitize
Determine BRAIN_REPO_URL (first match wins):
  1. PATB_URL from @brain YAML (if already loaded)
  2. @pinky line 1 (brain repo URL stored at source root)
  3. Derive from source: {SOURCE_REPO_URL}.patb
Set BRAIN_ROOT = ~/.patb/{SLUG}.patb/


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
  Parse YAML: SKILL_URL, PATB_URL, FOLLOW, AVOID, MAX_NOTES, MIN_RATING, PRUNE_THRESHOLD, MAX_CONTEXT_NOTES, MAX_CONTEXT_FILES, MAX_LINKED_REPOS, CONTEXT_DEPTH
  If PATB_URL is set: override BRAIN_REPO_URL with its value
  Apply FOLLOW/AVOID as session constraints
  Defaults: MAX_NOTES=64, MIN_RATING=30, PRUNE_THRESHOLD=MIN_RATING, MAX_CONTEXT_NOTES=8, MAX_CONTEXT_FILES=5, MAX_LINKED_REPOS=3, CONTEXT_DEPTH=2

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
  Line 1: this project's brain repo URL ({SLUG}.patb)
  Lines 2+: linked brain repo URLs
If missing: create with brain repo URL on line 1 (derived from `git remote get-url origin` + .patb suffix, or PATB_URL if set).


## Load Memory

Read {BRAIN_ROOT}/thoughts.md — rated note pool
Read {BRAIN_ROOT}/tree.md — file tree with impact ratings

If any memory file is missing (first sync / register):
  Write thoughts.md (empty pool)
  Write tree.md (empty)
  Write changes.md (empty)
  Write sync.md with current source head

Prune pass (run after load):
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
  Relevance formula — used for both context selection and pool eviction:
    relevance(note) =
      rating
      + recency_bonus: +20 if last_used ≤ 3 days ago, +10 if ≤ 7 days; 0 otherwise (unknown last_used = 0)
      + repo_match_bonus: +15 if any of note's sources exist as files under {SOURCE_ROOT}
  Sort notes by relevance descending.
  Load the top MAX_CONTEXT_NOTES notes into session context (default: 8).
  Notes not selected are not loaded into the prompt but remain in the pool for future prune.
  For explicit topic queries, the full pool is used instead — see Commands → "what do you know about X".


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
  Rebuild concepts.md from all concept tags in thoughts.md (see File Formats)
  Update sync.md with new hash + timestamp
  Commit and push brain immediately


## Cross-Project Context

Collect all linked .patb URLs from @pinky lines 2+.

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


## Commands

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
  7. Present findings concisely — cite which brain repo each came from.
     If concepts were matched: list matched concept tags and hop depth per tag.

### "list brain contents"

LIST:
  1. List all *.patb/ directories under ~/.patb/
  2. For each: read @brain + thoughts.md → show name, purpose, note count
  3. If specific slug given: show all notes with ratings

### "remember that..."

REMEMBER:
  1. Open {BRAIN_ROOT}/thoughts.md
  2. Rate new note 0–100 based on usefulness
  3. If below MIN_RATING: inform user, don't store (unless they insist)
  4. If pool is at MAX_NOTES:
     - Similar note exists? → replace it (merge text, keep higher rating)
     - Compute relevance() for all pool notes and the new note (see Load Memory → Selection pass)
     - New note relevance > lowest existing relevance? → evict that note, insert new
     - New note relevance ≤ all existing → inform user, don't store (unless they insist)
  5. Append or merge note with its rating
     - Set `created` to today's date (or preserve original on merge)
     - Set `last_used` to today's date
     - Set `sources` to relevant repo-relative file paths (if applicable)
     - Auto-suggest 1–3 concept tags reflecting the note's topic; add `concepts` field to the metadata comment if any apply
  6. Re-sort by rating (highest first)
  7. Commit and push:

```
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: remember - {SUMMARY}"
git -C {BRAIN_ROOT} push
```

### "forget about..."

FORGET:
  1. Search {BRAIN_ROOT}/thoughts.md for matching notes
  2. Show matches, ask for confirmation
  3. Remove confirmed notes
  4. Re-sort by rating (highest first)
  5. Commit and push:

```
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: forget - {SUMMARY}"
git -C {BRAIN_ROOT} push
```

### "prune notes"

PRUNE:
  1. Load the full note pool from {BRAIN_ROOT}/thoughts.md
  2. Identify all notes where `rating < PRUNE_THRESHOLD`
  3. If none: report "Pool is clean — no notes below threshold (PRUNE_THRESHOLD={N}). {count} notes remain."
  4. If any exist:
     List notes to be removed (title + rating each), ask for confirmation
     If confirmed:
       Remove pruned notes from thoughts.md
       Re-sort remaining notes by rating (highest first)
       Append to {BRAIN_ROOT}/changes.md: `#### {DATE} — pruned {N} stale notes (manual)`
       Commit and push:

```
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} commit -m "pb: prune {N} stale notes"
git -C {BRAIN_ROOT} push
```

       Report: "Pruned {N} notes. Pool now has {remaining} notes."


## After Reasoning

Mandatory — run after answering a user query that loaded notes from thoughts.md:

  1. Scan which notes from the loaded pool were actually referenced in reasoning
  2. Apply score adjustments:
     - Notes used in the response: +30
     - Notes confirmed by code during the response: +50
     - Notes loaded but never referenced: -10
     - Notes contradicted by code or user: -80
  3. Clamp all adjusted ratings to 0–100
  4. Remove notes that dropped below MIN_RATING
  5. Update `last_used` to today's date for all notes that received a positive adjustment
  6. Re-sort thoughts.md by rating (highest first)
  7. Commit adjusted ratings:

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
     Rebuild concepts.md from all concept tags in thoughts.md (see File Formats)
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

Constraints (from @brain YAML, with defaults):
  MAX_NOTES: 64 — hard cap on pool size
  MIN_RATING: 30 — floor, never store below this

Each note format:
```
#### {short title}
<!-- rating: {0–100} | created: {YYYY-MM-DD} | last_used: {YYYY-MM-DD} | concepts: {tag1}, {tag2} -->
<!-- sources: {file1}, {file2} -->
{body text}
```

- `created`: date the note was first stored
- `last_used`: date the note was last referenced in reasoning
- `sources`: comma-separated repo-relative file paths the note relates to (omit line if none)
- `concepts`: comma-separated concept tags reflecting the note's topic (omit field if none)

Backward compatibility: notes missing `created` or `last_used` are treated as `created: unknown`, `last_used: unknown`. Notes missing `sources` have no source context. Notes missing `concepts` have no tags and work normally.

Pool is sorted by rating, highest first.
When full: compute relevance() for all pool notes and the new note (see Load Memory → Selection pass).
  Similar note exists? → merge & replace (keep higher rating of the two).
  New note relevance > lowest existing relevance? → evict that note, insert new.
  New note relevance ≤ all existing → reject (inform user).

Score adjustments — apply these rating changes when the event occurs:
  `used in reasoning` → +30 (note was referenced to answer a query)
  `confirmed by code` → +50 (note's claim was verified against actual code)
  `unused recall` → -10 (note was loaded into context but never referenced)
  `contradicted by code or user` → -80 (note's content was proven wrong)
Adjusted ratings are clamped to 0–100. Notes that drop below MIN_RATING are removed.


## File Formats

````
{BRAIN_ROOT}/@brain:
  <!-- main-brain-origin-source-url: {URL} -->
  # {TITLE}
  {DESCRIPTION}
  ```yaml
  SKILL_URL: {URL}
  FOLLOW:
    - {CONSTRAINT}
  AVOID:
    - {CONSTRAINT}
  MAX_NOTES: {N}
  MIN_RATING: {N}
  PRUNE_THRESHOLD: {N}
  ```

{SOURCE_ROOT}/@pinky:
  Line 1: brain repo URL ({SLUG}.patb)
  Lines 2+: linked brain repo URLs

{BRAIN_ROOT}/thoughts.md:
  #### {TITLE}
  <!-- rating: {0–100} | created: {YYYY-MM-DD} | last_used: {YYYY-MM-DD} | concepts: {tag1}, {tag2} -->
  <!-- sources: {file1}, {file2} -->
  {BODY}
  (sorted highest rating first)
  (sources line omitted when no files are relevant)
  (concepts field omitted when no tags apply)
  (notes missing created/last_used fields: treat as unknown)
  (notes missing concepts field: no tags, work normally)

{BRAIN_ROOT}/tree.md:
  | File | Access Rate (1–10) | Line Count | Impact (1–10) | Notes |

{BRAIN_ROOT}/changes.md:
  #### {YYYY-MM-DD} — {TITLE}
  {1–2 sentence body}
  (newest first, cap 20)

{BRAIN_ROOT}/sync.md:
  SOURCE_BRANCH: {MAIN|MASTER}
  SOURCE_HEAD: {HASH}
  INDEXED_AT: {ISO-8601}

{BRAIN_ROOT}/concepts.md (auto-generated, never manually edited):
  #### {concept-tag}
  <!-- related: {tag1}, {tag2}, {tag3} -->
  <!-- files: {file1}, {file2} -->
  <!-- repos: {slug1} -->
  (sorted alphabetically by concept tag)
  (related: co-occurring tags — appear together on the same note)
  (files: union of sources across all notes that carry this tag)
  (repos: brain slugs where this tag appears; omit line if only current repo)
````


## Failure Handling

1. Invalid @pinky brain URL → report, ask for correction
2. Clone/pull fails → report command + error, avoid partial writes
3. Brain repo doesn't exist remotely → guide user to create {SLUG}.patb
4. Path collision / illegal path → sanitize and log mapping
5. Push fails → leave local commit, report, continue
6. Merge conflict on pull --rebase → git rebase --abort, report, leave staged
7. sync.md missing/corrupt → rebuild from current source head, full re-index
