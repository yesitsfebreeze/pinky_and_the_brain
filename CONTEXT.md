# p&b — Shared Context


## Identity & Paths

SOURCE_ROOT = workspace root (directory containing @pinky)

```
git remote get-url origin
```
Derive {SLUG}: last path segment → strip .git → lowercase → sanitize

Brain repo URL priority (first match wins):
  1. PATB_URL from @brain YAML
  2. Line 1 of {SOURCE_ROOT}/@pinky
  3. Derive: {SOURCE_REPO_URL}.patb

Set BRAIN_ROOT = ~/.patb/{SLUG}.patb/
If working inside a .patb repo directly: use cwd as BRAIN_ROOT, skip clone/pull.

Path truth table:
  SOURCE_ROOT            -> workspace repo root (has @pinky)
  BRAIN_ROOT             -> ~/.patb/{SLUG}.patb/ (has @brain + memory files)
  GLOBAL_INDEX_ROOT      -> ~/.patb/@brain/ (catalog only)

Never assume @brain is inside SOURCE_ROOT.


## Key Files

| Path | Purpose |
|---|---|
| `{SOURCE_ROOT}/@pinky` | Public `.patb` repo links only. Line 1: this repo's own brain URL (always itself); lines 2+: linked repos (http/git@ only); STATUS: {mode} line |
| `{BRAIN_ROOT}/@brain` | `<!-- main-brain-origin-source-url: {URL} -->` + YAML config |
| `{BRAIN_ROOT}/thoughts.md` | Rated note pool, sorted by rating desc |
| `{BRAIN_ROOT}/tree.md` | `\| File \| Access Rate (1–10) \| Line Count \| Impact (1–10) \| Notes \|` |
| `{BRAIN_ROOT}/changes.md` | `#### {YYYY-MM-DD} — {title}` entries, cap 20, newest first |
| `{BRAIN_ROOT}/sync.md` | `SOURCE_BRANCH / SOURCE_HEAD / INDEXED_AT` |
| `{BRAIN_ROOT}/concepts.md` | Auto-generated concept tag index (never manually edited) |
| `{SOURCE_ROOT}/@plan` | Plan/todo file; separator line: `█████████████████████` |

concepts.md entry format:
```
#### {concept-tag}
<!-- related: {tag1}, {tag2} -->
<!-- files: {file1}, {file2} -->
<!-- repos: {slug1} -->
```
(sorted alphabetically; repos line omitted when only current repo)


## @brain Config Defaults

| Variable | Default | Notes |
|---|---|---|
| MAX_NOTES | 64 | Hard cap on pool size |
| MIN_RATING | 300 | Never store below this |
| PRUNE_THRESHOLD | MIN_RATING | Min rating to survive prune |
| MAX_CONTEXT_NOTES | 8 | Max notes loaded into prompt |
| MAX_CONTEXT_FILES | 5 | Max tree.md rows surfaced |
| MAX_LINKED_REPOS | 3 | Max linked repos queried |
| CONTEXT_DEPTH | 2 | Max concept link hops |


## Note Format

```
#### {short title}
<!-- rating: {0–1000} | created: {YYYY-MM-DD} | last_used: {YYYY-MM-DD} | concepts: {tag1}, {tag2} | related-notes: {title1}, {title2} -->
<!-- sources: {file1}, {file2} -->
{body text}
```

- Omit `sources` line if no relevant files
- Omit `concepts` field if no tags apply
- Omit `related-notes` field if no direct links
- Missing `created`/`last_used`: treat as `unknown`
- Pool sorted by rating descending
- Backward compat: ratings ≤ 100 (pre 0–1000 upgrade) → multiply by 10 on first load


## Relevance Formula

```
relevance(note) =
  rating
  + recency_bonus:    +20 if last_used ≤ 3 days ago, +10 if ≤ 7 days; 0 otherwise (unknown = 0)
  + repo_match_bonus: +15 if any of note's sources exist as files under {SOURCE_ROOT}
```


## Score Adjustments

| Event | Delta |
|---|---|
| Used in reasoning | +300 |
| Confirmed by code | +500 |
| Unused recall | −100 |
| Contradicted by code or user | −800 |

Clamp to 0–1000. Remove notes that drop below MIN_RATING.
Update `last_used` to today for notes with positive adjustments.


## Git: Commit Brain

```bash
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: {MSG}"
git -C {BRAIN_ROOT} push
```


## Failure Handling

1. Invalid @pinky brain URL → report, ask for correction
2. Clone/pull fails → report command + error, avoid partial writes
3. Brain repo doesn't exist remotely → guide user to create {SLUG}.patb
4. Path collision / illegal path → sanitize and log mapping
5. Push fails → leave local commit, report, continue
6. Merge conflict on pull --rebase → `git rebase --abort`, report, leave staged
7. sync.md missing/corrupt → rebuild from current source head, full re-index
