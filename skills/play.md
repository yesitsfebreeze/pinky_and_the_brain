# pb-play — Execute Next Todo

## Version Check

Fetch: `https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/version`
Compare line 1 to local `~/.agents/skills/patb/version`.
If missing or differs: run @resync, then continue.

## Setup

Resolve identity per CONTEXT.md: derive {SLUG}, set BRAIN_ROOT, SOURCE_ROOT.
Sync: `git -C {BRAIN_ROOT} pull --rebase`


## Execute: @play

TODO WORKFLOW:
  1. Open {SOURCE_ROOT}/@plan.
     If missing: inform user, offer to create it.
     WRITE STATUS play: read @pinky, update or append `STATUS: play`, save.
  2. Parse the separator line (█████████████████████):
     - Content above the separator: raw ideas
     - Content below the separator: AI-generated actionable todos
  3. Select the next todo:
     MCP FAST PATH: If `mcp_patb_plan_next` tool is available:
       Call: `mcp_patb_plan_next()` — returns the first pending todo below the separator (or null).
       If null: fall through to raw-ideas path below.
       If returned: use that todo as the selected item; skip manual parse.
     MANUAL PATH (fallback):
     - If AI-generated todos exist (below separator): pick the most impactful one
       based on current session context and brain notes.
     - If no AI-generated todos exist: look at raw ideas (above separator),
       select the most actionable, convert it to a todo and append below the separator,
       then proceed to implement it.
  4. Gather context: load relevant notes from thoughts.md, check tree.md for
     impacted files, read source files as needed.
  5. Implement the selected todo using available tools.
  6. When done: delete the todo text from {SOURCE_ROOT}/@plan (below separator).
     MCP FAST PATH: If `mcp_patb_plan_complete` tool is available:
       Call: `mcp_patb_plan_complete(todo_text)` — removes the matched line; skip manual edit.
     MANUAL PATH (fallback): edit @plan directly, removing the completed todo line.
  7. Commit all changes to the source repo:

```
git -C {SOURCE_ROOT} add -A
git -C {SOURCE_ROOT} diff --cached --quiet || git -C {SOURCE_ROOT} commit -m "{SUMMARY}"
```

  8. When no todos remain (above or below separator):
     CLEAR STATUS: read @pinky, remove any `STATUS: ...` line, save.
  9. Report what was done and what the next todo would be.

If `@play` is called with no above-separator content and no below-separator todos:
  Inform the user and ask what to work on.
