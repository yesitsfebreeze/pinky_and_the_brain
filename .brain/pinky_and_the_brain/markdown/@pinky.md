# @pinky

## Purpose
Marker file placed at the root of any project that opts into the pinky memory system. Points to the brain repo (line 1) and this project's own source repo (line 2). Also holds two AI-maintained sections: `# interesting` (related repos to search for context) and `# files` (touched files ranked by importance).

## Key Decisions
- Line 1 == line 2 signals this repo is the brain itself — no external clone needed
- `# interesting` section is auto-appended by the AI as it discovers related repos in conversation; never manually curated
- `# files` section is fully rewritten by the AI after each sync, ranked by architectural importance
- Format kept minimal and line-oriented so it is trivially parseable without a library

## Pitfalls
- The file originally had only one line (the brain URL); the source URL on line 2 had to be added manually in this session — new projects should always have both lines from the start
- Strip `.git` suffix when comparing line 1 and line 2 for the self-referential check

## Useful Facts
- Importance ranking for `# files`: 1) architecture/core logic, 2) security, 3) public API, 4) build/test, 5) docs/style
- Any project can opt in by adding just two lines to a new `@pinky` file — the AI handles everything else on first sync

## Last Updated
- 2026-03-08T00:00:00Z
- Source repo: https://github.com/yesitsfebreeze/pinky-and-the-brain
