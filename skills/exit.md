# pb-exit — Exit Plan or Play Mode

## Main Repo Sync

Before executing this command, ensure main p&b repo is current:
`git -C ~/.patb/@brain pull --rebase`
If pull fails, stop and report the error.

## Setup

Resolve SOURCE_ROOT per CONTEXT.md.


## Execute: @exit

EXIT WORKFLOW:
  1. Clear PLAN_MODE flag (if set).
  2. Clear PLAY_MODE flag (if set).
  3. CLEAR STATUS: read @pinky, remove any `STATUS: ...` line, save.
  4. If any mode was active:
     - Resume normal conversational mode.
     - If PLAN_MODE was active: confirm exit with "Back. Here's what I captured:"
       followed by the current above-separator content of @plan (verbatim, no edits).
     - If PLAY_MODE was active: confirm abort with a one-line summary of any
       work completed before the exit.
  5. If no mode was active: acknowledge with a single word and resume normal mode.
