---
SKILL_URL:         https://github.com/yesitsfebreeze/pinky-and-the-brain/SKILL.md
REPO_URL:          https://github.com/{USER}/{REPO}  # can be inferred from `git remote get-url origin`
PATB_URL:          https://github.com/{USER}/{REPO}.patb  # optional — partial override; {USER} and {REPO} fall back to REPO_URL values (e.g. different user, same name: https://github.com/other-user/{REPO}.patb)
MAX_NOTES:         512
MIN_RATING:        300
PRUNE_THRESHOLD:   300   # minimum rating to survive a prune pass (default: same as MIN_RATING)
MAX_CONTEXT_NOTES: 8     # max notes loaded into prompt per session
MAX_CONTEXT_FILES: 5     # max tree.md entries surfaced per session
MAX_LINKED_REPOS:  3     # max linked brain repos queried per session
CONTEXT_DEPTH:     2     # max concept-link hops during query expansion
# avoid:
#   - "store unrelated data"
# follow:
#   - "generate todos for ideas display them to the user when he types @todo"
---

# 🧠 Pinky & The Brain

Persistent cross-project AI memory for AI coding assistants.

## How It Works

Each project gets a companion `.patb` brain repo that stores AI memory — decisions, pitfalls, conventions, and cross-project context — so your AI assistant remembers things across sessions.

{SOURCE_ROOT}
```
┌ my-project/ 
├── @pinky
├── @plan
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
Otherwise, fill in `REPO_URL` in the frontmatter above before pasting.
If the `.patb` brain repo doesn't exist on your remote yet, the AI will ask if you want to create and push it.
The AI will fetch the installer and set everything up automatically.

Read the frontmatter config at the top of this file. If any required field still contains a
{PLACEHOLDER}, stop and ask the user to fill it in before continuing.

<!-- Uncomment for dry run:
DRY_RUN = TRUE
-->

Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SETUP.md

## Resync

If a project's p&b setup is broken or too far behind to self-update
(e.g. missing update mechanism, corrupted skill, desynced branch),
paste this into an AI chat to force a full re-install from latest main:

```
RESYNC = TRUE
Fetch and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/SETUP.md

This is a (re)install over the existing setup.
Preserve all user content: thoughts.md, changes.md, tree.md, sync.md, @pinky linked repos, @plan (create if missing).
Overwrite everything else (skill, instructions, @brain structure).
```

## Commands

| Command                    | What it does                       |
|----------------------------|---------------------------------|
| "what do you know about X" | Search thoughts.md + linked repos  |
| `@remember <that...>`      | Rate + store note, commit & push   |
| `@forget <about...>`       | Search for matching notes, confirm, remove, commit & push |
| `@brain`                   | List all brain repos + note counts; show all notes for a specific slug |
| `@prune`                   | Remove all notes below PRUNE_THRESHOLD, commit & push |
| `@commit`                  | Group changes by scope, create per-scope commits, push → triggers .patb indexing |
| `@plan`                    | Enter plan mode — each message is silently captured into `@plan` above the separator |
| `@play`                    | Exit plan mode and pick the most impactful next todo from `@plan`, gather context, solve it, delete the todo, and commit |
| `@exit`                    | Exit plan mode or play mode and return to normal conversation |
| `@resync`                  | Re-install p&b from latest main, preserving all user content |

## File Formats

All memory files live in `{BRAIN_ROOT}` (`~/.patb/{SLUG}.patb/`):

**@brain** — project identity + config
```
---
Each setting from the yaml configuration
---

<!-- main-brain-origin-source-url: {URL} -->
# Title
Description
```


**{SOURCE_ROOT}/@pinky**
```
Line 1: brain repo URL ({SLUG}.patb)
Lines 2+: linked brain repo URLs
STATUS: plan|play|idle   # active mode — written by @plan/@play, cleared by @exit
```

**{SOURCE_ROOT}/@plan**
```
Freeform ideas/notes (above the thick separator ████)
████████████████████
AI-generated todos (below the separator — managed by @play)
```

**thoughts.md** — rated note pool (highest first)
```
#### Short title
<!-- rating: 85 | created: 2026-01-01 | last_used: 2026-03-01 | concepts: tag1, tag2 -->
<!-- sources: src/foo.ts -->
Body text.
```
The `sources` line and `concepts` field are optional; omit when not applicable.

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

## Context Loading

At session start the full note pool in `thoughts.md` is processed in two passes before anything is loaded into the AI prompt:

1. **Prune** — Notes whose rating has fallen below `PRUNE_THRESHOLD` are deleted from `thoughts.md` and logged in `changes.md`.
2. **Selection** — The surviving notes are ranked by relevance (base rating + recency bonus if used within 7 days + repo-match bonus if its sources exist in the current workspace). The top `MAX_CONTEXT_NOTES` notes are loaded into the session; the rest remain in the pool for future prune cycles but are not included in the prompt.

For explicit queries (`"what do you know about X"`) the full pool is searched instead of limiting to `MAX_CONTEXT_NOTES`.

| Config key | Default | Effect |
|---|---|---|
| `PRUNE_THRESHOLD` | `MIN_RATING` | Minimum rating to survive a prune pass |
| `MAX_CONTEXT_NOTES` | `8` | Max notes loaded into a session prompt |
| `MAX_CONTEXT_FILES` | `5` | Max `tree.md` entries surfaced per session |
| `MAX_LINKED_REPOS` | `3` | Max linked brain repos queried per session |

## Concept Graph

Every note can carry 1–3 concept tags in its `concepts` field (see `thoughts.md` format above). Tags are assigned automatically when a note is stored via `remember` or created during catch-up indexing after a source push.

All tags are aggregated into `concepts.md` (auto-generated — never edit manually):

**concepts.md**
```
#### {concept-tag}
<!-- related: tag1, tag2 -->   ← other tags that co-occur with this one
<!-- files: src/foo.ts -->      ← union of sources across all notes with this tag
<!-- repos: other-project -->   ← only present when tag appears in a linked repo
```

When you query `"what do you know about X"`, the skill does a concept-match pass before scoring notes by text: it finds every tag matching X, then walks the `related` links up to `CONTEXT_DEPTH` hops. Notes tagged with any matched concept receive a topic-score bonus and appear in results even when the literal query text is absent from their body.

| Config key | Default | Effect |
|---|---|---|
| `CONTEXT_DEPTH` | `2` | Maximum concept-link hops during query expansion |
