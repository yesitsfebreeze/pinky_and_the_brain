# pb-forget — Remove a Note

## Main Repo Sync

Before executing this command, ensure main p&b repo is current:
`git -C ~/.patb/@brain pull --rebase`
If pull fails, stop and report the error.

## Setup

Resolve identity per CONTEXT.md: derive {SLUG}, set BRAIN_ROOT, SOURCE_ROOT.
Sync: `git -C {BRAIN_ROOT} pull --rebase`


## Execute: @forget

MCP FAST PATH (preferred when available):
  If `mcp_patb_forget` tool is available:
    Call: `mcp_patb_forget(query)`
    Done — skip the manual steps below.

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
