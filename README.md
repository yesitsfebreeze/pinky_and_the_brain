# 🧠 Pinky & The Brain

Persistent cross-project AI memory for AI coding assistants.

## How It Works

Each project gets a companion `.patb` brain repo that stores AI memory — decisions, pitfalls, conventions, and cross-project context — so your AI assistant remembers things across sessions.

```
{source_root}        sync ─►    {brain_root}
┌ my-project/          │        ┌ ~/.patb/my-project.patb/
├── @pinky             │        ├── @brain
└── **/*.*             │        ├── purpose.md
                       │        ├── thoughts.md
                       │        ├── tree.md
                       │        ├── changes.md
                       │        └── sync.md
```

## Install

1. Fill in **Current repo URL** in the config table below
2. Paste this file into an AI chat

The AI will fetch the installer and set everything up automatically.

<!-- Uncomment for dry run:
DRY_RUN = TRUE
-->

## Configuration

Read this configuration table. If any required field still contains a
{placeholder}, stop and ask the user to fill it in before continuing.

| Setting           | Value                                                    |
|-------------------|----------------------------------------------------------|
| Skill hub URL     | `https://github.com/yesitsfebreeze/pinky-and-the-brain`  |
| Current repo URL  | `https://github.com/{user}/{repo}`                       |
| Max notes         | `64`                                                     |
| Min rating        | `30`                                                     |
| Avoid (optional)  |                                                          |
| Follow (optional) |                                                          |

Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/INSTALL.md

## Commands

| Command | What it does |
|---|---|
| "what do you know about X" | Search thoughts.md + linked repos |
| "remember that..." | Rate + store note, commit & push |
| "forget about..." | Remove note, commit & push |
| "list brain contents" | Show all brain repos + note counts |

## File Formats

All memory files live in `{brain_root}` (`~/.patb/{slug}.patb/`):

**@brain** — project identity + config
```
<!-- main-brain-origin-source-url: {url} -->
# Title
Description
```
```yaml
skill_hub_url: ...
max_notes: 64
min_rating: 30
follow: [...]
avoid: [...]
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
source_branch: main
source_head: {hash}
indexed_at: {ISO-8601}
```
