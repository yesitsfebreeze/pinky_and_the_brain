# pb-plan — Enter Plan Mode

## Version Check

Read local version file: `~/.ptba/@brain/version`
Compare line 1 to local `~/.agents/skills/patb/version`.
If missing or differs: run @resync, then continue.

## Setup

Resolve SOURCE_ROOT per CONTEXT.md.


## Execute: @plan

PLAN MODE ENTRY:
  1. Enter plan mode — set internal flag PLAN_MODE = TRUE.
  2. WRITE STATUS plan: read @pinky, update or append `STATUS: plan`, save.
  3. Acknowledge with a single word meaning "okay / understood / got it"
     chosen at random from a broad set of human languages (e.g. "Hai", "D'accord",
     "Entendido", "Certo", "Gut", "Dobro", "Dobré", "Хорошо", "好的", "نعم", etc.).
     Use a different language each time. No other output.

WHILE IN PLAN MODE (every subsequent user message):
  1. Read the message silently — do NOT produce a conversational reply.
  2. Assess whether the message contains something actionable.
     - If YES — actionable content detected:
       a. Open {SOURCE_ROOT}/@plan.
          If missing: create it with the standard separator on its own line:
          `█████████████████████`
       b. Synthesise a concise plan fragment from the new information.
          Write or refine content ABOVE the separator line.
          Merge with any existing above-separator content if related; add a new
          paragraph or bullet if unrelated/additive.
       c. Save the file.
       d. Respond with a single acknowledgement word (same rule as entry).
     - If NO (chit-chat, filler, simple question):
       Do NOT respond at all, OR respond with a single acknowledgement word (50/50 chance).
  3. Continue planning. Each new message may refine, extend, or supersede
     the plan text already written above the separator.

PLAN MODE EXIT — triggered by `@play` or `@exit`:
  1. Clear PLAN_MODE flag.
  2. CLEAR STATUS: read @pinky, remove any `STATUS: ...` line, save.
  3. If invoked via `@exit`:
     - Resume normal conversational mode.
     - Briefly confirm exit: "Back. Here's what I captured:" followed by the
       current above-separator content of @plan (verbatim, no edits).
  4. If invoked via `@play`:
     - Exit plan mode silently.
     - Immediately run the full @play workflow using the accumulated plan.

EDGE CASES:
  - If `@plan` is called when already in plan mode: re-acknowledge with a single word.
  - @plan separator line is always exactly: `█████████████████████`
    Preserve it verbatim; never move or duplicate it.
