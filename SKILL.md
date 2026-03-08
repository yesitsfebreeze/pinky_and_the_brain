# Pinky & The Brain — Skill

## Configuration

Read configuration from {BRAIN_ROOT}/@brain:
  - Parse `main-brain-origin-source-url` from the HTML comment
  - Parse YAML: SKILL_URL, FOLLOW, AVOID, MAX_NOTES, MIN_RATING
  - Apply FOLLOW/AVOID as session constraints
  - Defaults if missing: MAX_NOTES=64, MIN_RATING=30


## Resolve Identity

Determine source repo URL: `git remote get-url origin` (fallback to @pinky line 1)
Derive {SLUG}: last path segment → strip .git → lowercase → sanitize
Derive BRAIN_REPO_URL: {SOURCE_REPO_URL}.patb
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
  Parse YAML: SKILL_URL, FOLLOW, AVOID, MAX_NOTES, MIN_RATING
  Apply FOLLOW/AVOID as session constraints
  Defaults: MAX_NOTES=64, MIN_RATING=30

If @brain is missing or invalid (empty, no origin comment, no YAML):
  Create/repair using canonical format:

````
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
```
````


## @pinky

Read {SOURCE_ROOT}/@pinky:
  Line 1: current repo URL
  Lines 2+: linked .patb repo URLs
If missing: create with URL from `git remote get-url origin` on line 1.


## Load Memory

Read {BRAIN_ROOT}/thoughts.md — rated note pool
Read {BRAIN_ROOT}/tree.md — file tree with impact ratings

If any memory file is missing (first sync / register):
  Write thoughts.md (empty pool)
  Write tree.md (empty)
  Write changes.md (empty)
  Write sync.md with current source head


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
  Update sync.md with new hash + timestamp
  Commit and push brain immediately


## Cross-Project Context

For each linked .patb URL in @pinky lines 2+:
  Check for local clone at ~/.patb/{LINK_SLUG}.patb/
  If present: read @brain (title + description = project purpose)
  If not present: fetch @brain via raw URL:

```
GitHub:  https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/@brain
GitLab:  https://gitlab.com/{OWNER}/{REPO}/-/raw/{BRANCH}/@brain
Other:   use host's raw endpoint for {DEFAULT_BRANCH}
```

  Default branch detection: git symbolic-ref, or try main then master
  Read changes.md — surface entries from last 7 days or since last pull
  If project is relevant to current session: sub-search thoughts.md
  If not relevant: skip to next
  Surface useful cross-project context and recent changes


## Commands

### "what do you know about X"

QUERY:
  1. Read {BRAIN_ROOT}/@brain and thoughts.md
  2. Search notes for the topic
  3. For each linked .patb in @pinky:
     Read @brain — skip if project not relevant to query
     If relevant: sub-search that repo's thoughts.md
  4. Present findings concisely — cite which brain repo each came from

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
     - Similar note with lower rating? → replace it (merge text, keep higher rating)
     - New rating > lowest existing? → drop lowest
     - New rating < all existing? → inform user, don't store (unless they insist)
  5. Append or merge note with its rating
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
     Refresh @brain description and tree.md from current source state
     Append cross-project-relevant changes to changes.md (cap 20, newest first)
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
<!-- rating: {0–100} -->
{body text}
```

Pool is sorted by rating, highest first.
When full: new note must outrank an existing one to enter.
Similar note exists at lower rating → merge & replace.
No room + not better than worst → reject (inform user).


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
  ```

{SOURCE_ROOT}/@pinky:
  Line 1: source repo URL
  Lines 2+: linked .patb URLs

{BRAIN_ROOT}/thoughts.md:
  #### {TITLE}
  <!-- rating: {0–100} -->
  {BODY}
  (sorted highest rating first)

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
````


## Failure Handling

1. Invalid @pinky URL → report, ask for correction
2. Clone/pull fails → report command + error, avoid partial writes
3. Brain repo doesn't exist remotely → guide user to create {SLUG}.patb
4. Path collision / illegal path → sanitize and log mapping
5. Push fails → leave local commit, report, continue
6. Merge conflict on pull --rebase → git rebase --abort, report, leave staged
7. sync.md missing/corrupt → rebuild from current source head, full re-index
