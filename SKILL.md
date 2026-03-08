# Pinky & The Brain — Skill

## Configuration

Read configuration from {brain_root}/@brain:
  - Parse `main-brain-origin-source-url` from the HTML comment
  - Parse YAML: skill_hub_url, follow, avoid, max_notes, min_rating
  - Apply follow/avoid as session constraints
  - Defaults if missing: max_notes=64, min_rating=30


## Resolve Identity

Determine source repo URL: `git remote get-url origin` (fallback to @pinky line 1)
Derive {slug}: last path segment → strip .git → lowercase → sanitize
Derive brain repo URL: {source-repo-url}.patb
Set brain root = ~/.patb/{slug}.patb/


## Sync Brain Repo

If ~/.patb/{slug}.patb/.git does not exist:
  git clone {brain-repo-url} ~/.patb/{slug}.patb/
If it exists:
  Verify remote matches expected URL
  Check for uncommitted changes: `git -C {brain_root} status --porcelain`
  If changes: git add -A && commit "pb: update ({n} notes)" → pull --rebase → push
  If clean: `git -C {brain_root} pull --rebase`
If working inside a .patb repo directly: use cwd as brain root, skip clone/pull


## @brain

Read {brain_root}/@brain:
  Parse `main-brain-origin-source-url` from the HTML comment
  Parse YAML: skill_hub_url, follow, avoid, max_notes, min_rating
  Apply follow/avoid as session constraints
  Defaults: max_notes=64, min_rating=30

If @brain is missing or invalid (empty, no origin comment, no YAML):
  Create/repair using canonical format:

````
<!-- main-brain-origin-source-url: {url} -->
# {title}

{description}

```yaml
skill_hub_url: {url}
follow:
  - {constraint}
avoid:
  - {constraint}
max_notes: {N}
min_rating: {N}
```
````


## @pinky

Read {source_root}/@pinky:
  Line 1: current repo URL
  Lines 2+: linked .patb repo URLs
If missing: create with URL from `git remote get-url origin` on line 1.


## Load Memory

Read {brain_root}/purpose.md — project purpose and scope
Read {brain_root}/thoughts.md — rated note pool
Read {brain_root}/tree.md — file tree with impact ratings

If any memory file is missing (first sync / register):
  Infer purpose from README.md, config files, entry points
  Write purpose.md with 1–3 sentence description
  Write thoughts.md (empty pool)
  Write tree.md (empty)
  Write changes.md (empty)
  Write sync.md with current source head


## Catch-Up

Determine default branches: prefer main, fallback master (for both repos)

```
git -C {source_root} fetch origin --prune
git -C {brain_root} fetch origin --prune
```

If brain local is behind origin: pull --rebase first
Read source head hash/timestamp from origin/{source_branch}
Read indexed hash/timestamp from {brain_root}/sync.md (create if missing)
If source is newer than indexed:
  Index all commits since indexed hash into thoughts.md, tree.md, changes.md
  Update sync.md with new hash + timestamp
  Commit and push brain immediately


## Cross-Project Context

For each linked .patb URL in @pinky lines 2+:
  Check for local clone at ~/.patb/{link-slug}.patb/
  If present: read purpose.md
  If not present: fetch purpose.md via raw URL:

```
GitHub:  https://raw.githubusercontent.com/{owner}/{repo}/{branch}/purpose.md
GitLab:  https://gitlab.com/{owner}/{repo}/-/raw/{branch}/purpose.md
Other:   use host's raw endpoint for {default-branch}
```

  Default branch detection: git symbolic-ref, or try main then master
  Read changes.md — surface entries from last 7 days or since last pull
  If project is relevant to current session: sub-search thoughts.md
  If not relevant: skip to next
  Surface useful cross-project context and recent changes


## Commands

### "what do you know about X"

QUERY:
  1. Read {brain_root}/purpose.md and thoughts.md
  2. Search notes for the topic
  3. For each linked .patb in @pinky:
     Read purpose.md — skip if project not relevant to query
     If relevant: sub-search that repo's thoughts.md
  4. Present findings concisely — cite which brain repo each came from

### "list brain contents"

LIST:
  1. List all *.patb/ directories under ~/.patb/
  2. For each: read purpose.md + thoughts.md → show name, purpose, note count
  3. If specific slug given: show all notes with ratings

### "remember that..."

REMEMBER:
  1. Open {brain_root}/thoughts.md
  2. Rate new note 0–100 based on usefulness
  3. If below min_rating: inform user, don't store (unless they insist)
  4. If pool is at max_notes:
     - Similar note with lower rating? → replace it (merge text, keep higher rating)
     - New rating > lowest existing? → drop lowest
     - New rating < all existing? → inform user, don't store (unless they insist)
  5. Append or merge note with its rating
  6. Re-sort by rating (highest first)
  7. Commit and push:

```
git -C {brain_root} pull --rebase
git -C {brain_root} add -A
git -C {brain_root} diff --cached --quiet || git -C {brain_root} commit -m "pb: remember - {summary}"
git -C {brain_root} push
```

### "forget about..."

FORGET:
  1. Search {brain_root}/thoughts.md for matching notes
  2. Show matches, ask for confirmation
  3. Remove confirmed notes
  4. Re-sort by rating (highest first)
  5. Commit and push:

```
git -C {brain_root} pull --rebase
git -C {brain_root} add -A
git -C {brain_root} diff --cached --quiet || git -C {brain_root} commit -m "pb: forget - {summary}"
git -C {brain_root} push
```


## Post-Push

Mandatory — run immediately after successful source git push:

  1. Fetch both repos:
```
git -C {source_root} fetch origin --prune
git -C {brain_root} fetch origin --prune
```
  2. Resolve branches: main if present, else master (each repo)
  3. If brain behind origin/{brain_branch}: pull --rebase
  4. Compare source tip hash vs {brain_root}/sync.md indexed hash
     If source tip is not newer: stop (nothing to index)
  5. Index new commits since last indexed hash:
     Extract decisions, pitfalls, conventions, integration-impacting changes
     Merge into thoughts.md with rating/threshold/cap rules
     Refresh purpose.md and tree.md from current source state
     Append cross-project-relevant changes to changes.md (cap 20, newest first)
  6. Update {brain_root}/sync.md:
```
source_branch: {main|master}
source_head: {new-hash}
indexed_at: {now-ISO8601}
```
  7. Commit and push:
```
git -C {brain_root} add -A
git -C {brain_root} diff --cached --quiet || git -C {brain_root} commit -m "pb: index source push - {summary}"
git -C {brain_root} push
```


## Note Pool Rules

Constraints (from @brain YAML, with defaults):
  max_notes: 64 — hard cap on pool size
  min_rating: 30 — floor, never store below this

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
{brain_root}/@brain:
  <!-- main-brain-origin-source-url: {url} -->
  # {title}
  {description}
  ```yaml
  skill_hub_url: {url}
  follow:
    - {constraint}
  avoid:
    - {constraint}
  max_notes: {N}
  min_rating: {N}
  ```

{source_root}/@pinky:
  Line 1: source repo URL
  Lines 2+: linked .patb URLs

{brain_root}/purpose.md:
  # {slug}
  {1–3 sentence purpose}

{brain_root}/thoughts.md:
  #### {title}
  <!-- rating: {0–100} -->
  {body}
  (sorted highest rating first)

{brain_root}/tree.md:
  | File | Access Rate (1–10) | Line Count | Impact (1–10) | Notes |

{brain_root}/changes.md:
  #### {YYYY-MM-DD} — {title}
  {1–2 sentence body}
  (newest first, cap 20)

{brain_root}/sync.md:
  source_branch: {main|master}
  source_head: {hash}
  indexed_at: {ISO-8601}
````


## Failure Handling

1. Invalid @pinky URL → report, ask for correction
2. Clone/pull fails → report command + error, avoid partial writes
3. Brain repo doesn't exist remotely → guide user to create {slug}.patb
4. Path collision / illegal path → sanitize and log mapping
5. Push fails → leave local commit, report, continue
6. Merge conflict on pull --rebase → git rebase --abort, report, leave staged
7. sync.md missing/corrupt → rebuild from current source head, full re-index
