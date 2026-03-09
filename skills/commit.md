# pb-commit — Commit and Push Changes

## Main Repo Sync

Before executing this command, ensure main p&b repo is current:
`git -C ~/.patb/@brain pull --rebase`
If pull fails, stop and report the error.

## Setup

Resolve identity per CONTEXT.md: derive {SLUG}, set BRAIN_ROOT, SOURCE_ROOT.


## Execute: @commit

COMMIT WORKFLOW:
  1. Review all uncommitted changes in {SOURCE_ROOT}:
```
git -C {SOURCE_ROOT} status --short
git -C {SOURCE_ROOT} diff
```
  2. If nothing staged and nothing modified: report "Nothing to commit."
  3. Group changes by logical scope:
     - Analyse which files belong to the same feature, fix, refactor, or concern.
     - Create one commit per group, not one mega-commit for everything.
     - Typical groupings: feature changes together, config/tooling separately,
       docs separately, unrelated fixes as their own commits.
  4. For each group in order (most foundational first):
     a. Stage only its files:
```
git -C {SOURCE_ROOT} add {file1} {file2} ...
```
     b. Write a concise conventional commit message scoped to that group.
     c. Commit:
```
git -C {SOURCE_ROOT} commit -m "{scope}: {message}"
```
  5. Push all commits at once:
```
git -C {SOURCE_ROOT} push
```
  6. Run the Post-Push indexing loop:

```
git -C {SOURCE_ROOT} fetch origin --prune
git -C {BRAIN_ROOT} fetch origin --prune
```
     - If brain behind origin: pull --rebase
     - Compare source tip hash vs {BRAIN_ROOT}/sync.md indexed hash
     - If source is newer: index new commits → update thoughts.md, tree.md, changes.md, sync.md
     - Commit and push brain:
```
git -C {BRAIN_ROOT} add -A
git -C {BRAIN_ROOT} diff --cached --quiet || git -C {BRAIN_ROOT} commit -m "pb: index source push - {SUMMARY}"
git -C {BRAIN_ROOT} push
```
