# 🧠 Pinky & The Brain

Persistent cross-project AI memory for AI coding assistants.

## How It Works

Each project gets a companion `.patb` brain repo that stores AI memory — decisions, pitfalls, conventions, and cross-project context — so your AI assistant remembers things across sessions.

{SOURCE_ROOT}
```
┌ my-project/ 
├── @pinky
└── **/*.*
```
automatic ai sync into:

{BRAIN_ROOT}
```
┌ ~/.patb/my-project.patb/ 
├── @brain
├── thoughts.md
├── tree.md
├── changes.md
└── sync.md
```

## Install

1. Paste this file into an AI chat

If the workspace has a git remote, `REPO_URL` is inferred automatically via `git remote get-url origin`.
Otherwise, fill in `REPO_URL` in the config below before pasting.
If the `.patb` brain repo doesn't exist on your remote yet, the AI will ask if you want to create and push it.
The AI will fetch the installer and set everything up automatically.

<!-- Uncomment for dry run:
DRY_RUN = TRUE
-->

## Configuration

Read this configuration. If any required field still contains a
{PLACEHOLDER}, stop and ask the user to fill it in before continuing.

```yaml
SKILL_URL:  https://github.com/yesitsfebreeze/pinky-and-the-brain/SKILL.md
REPO_URL:   https://github.com/{USER}/{REPO}  # can be inferred from `git remote get-url origin`
# PATB_URL: https://github.com/{USER}/{REPO}.patb  # optional — override brain repo URL when it differs from {REPO_URL}.patb
MAX_NOTES:  512
MIN_RATING: 30
# avoid: [
#  "store unrelated data",
#  ...
# ]
# follow: [
#  "generate todos for ideas display them to the user when he types @todo"
# ]
```

Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SETUP.md

## Resurrect

If a project's p&b setup is broken or too far behind to self-update
(e.g. missing update mechanism, corrupted skill, desynced branch),
paste this into an AI chat to force a full re-install from latest main:

```
RESSURECT = TRUE
Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SETUP.md

This is a ressurect/re-install over the existing setup.
Preserve all user content: thoughts.md, changes.md, tree.md, sync.md, @pinky linked repos.
Overwrite everything else (skill, instructions, @brain structure).
```

## Commands

| Command                    | What it does                       |
|----------------------------|------------------------------------|
| "what do you know about X" | Search thoughts.md + linked repos  |
| "remember that..."         | Rate + store note, commit & push   |
| "forget about..."          | Remove note, commit & push         |
| "list brain contents"      | Show all brain repos + note counts |

## File Formats

All memory files live in `{BRAIN_ROOT}` (`~/.patb/{SLUG}.patb/`):

**@brain** — project identity + config
```
<!-- main-brain-origin-source-url: {URL} -->
# Title
Description
```
```yaml
SKILL_URL: ...
PATB_URL: ...   # optional — only present when brain repo URL differs from {REPO_URL}.patb
MAX_NOTES: 64
MIN_RATING: 30
FOLLOW: [...]
AVOID: [...]
```

**@pinky** — at source repo root
```
Line 1: source repo URL
Lines 2+: linked .patb repo URLs
```

**thoughts.md** — rated note pool (highest first)
```
#### Short title
<!-- rating: 85 -->
Body text.
```

**tree.md** — file impact map
```
| File | Access Rate (1–10) | Line Count | Impact (1–10) | Notes |
```

**changes.md** — cross-project changelog (newest first, cap 20)
```
#### 2026-03-08 — Short title
1–2 sentence body.
```

**sync.md** — last indexed state
```
SOURCE_BRANCH: main
SOURCE_HEAD: {HASH}
INDEXED_AT: {ISO-8601}
```
