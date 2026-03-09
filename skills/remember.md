# pb-remember — Store a Note

## Main Repo Sync

Before executing this command, ensure main p&b repo is current:
`git -C ~/.patb/@brain pull --rebase`
If pull fails, stop and report the error.

## Setup

Resolve identity per CONTEXT.md: derive {SLUG}, set BRAIN_ROOT, SOURCE_ROOT.
Sync: `git -C {BRAIN_ROOT} pull --rebase`
Read {BRAIN_ROOT}/@brain for YAML config (MIN_RATING, MAX_NOTES, etc.)


## Execute: @remember

MCP FAST PATH (preferred when available):
  If `mcp_patb_remember` tool is available:
    Call: `mcp_patb_remember(text, concepts?, sources?, rating?)`
    Done — skip the manual steps below.

REMEMBER:
  1. Open {BRAIN_ROOT}/thoughts.md
  2. Rate new note 0–1000 based on usefulness
  3. If below MIN_RATING: inform user, don't store (unless they insist)
  4. If pool is at MAX_NOTES:
     - Similar note exists? → replace it (merge text, keep higher rating)
     - Compute relevance() for all pool notes and the new note:
         relevance(note) = rating
           + recency_bonus: +20 if last_used ≤ 3 days ago, +10 if ≤ 7 days; 0 otherwise
           + repo_match_bonus: +15 if any of note's sources exist as files under {SOURCE_ROOT}
     - New note relevance > lowest existing relevance? → evict that note, insert new
     - New note relevance ≤ all existing → inform user, don't store (unless they insist)
  5. Append or merge note with its rating
     - Set `created` to today's date (or preserve original on merge)
     - Set `last_used` to today's date
     - Set `sources` to relevant repo-relative file paths (if applicable)
     - Auto-suggest 1–3 concept tags reflecting the note's topic; add `concepts` field to the metadata comment if any apply
     - Scan pool for notes sharing ≥1 concept tag with the new note; suggest at most 3 as `related-notes` candidates; add `related-notes` field if user accepts (omit field if none proposed or declined)
  6. Re-sort by rating (highest first)
  7. Commit and push:

```
git -C {BRAIN_ROOT} pull --rebase
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: remember - {SUMMARY}"
git -C {BRAIN_ROOT} push
```


