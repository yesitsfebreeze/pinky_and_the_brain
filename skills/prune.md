# pb-prune — Prune Stale Notes

## Version Check

Read local version file: `~/.ptba/@brain/version`
Compare line 1 to local `~/.agents/skills/patb/version`.
If missing or differs: run @resync, then continue.

## Setup

Resolve identity per CONTEXT.md: derive {SLUG}, set BRAIN_ROOT, SOURCE_ROOT.
Sync: `git -C {BRAIN_ROOT} pull --rebase`
Read {BRAIN_ROOT}/@brain for YAML config (PRUNE_THRESHOLD, MIN_RATING, etc.)


## Execute: @prune

MCP FAST PATH (preferred when available):
  If `mcp_patb_prune` tool is available:
    Call: `mcp_patb_prune(threshold?)`
    Done — skip the manual steps below.

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
