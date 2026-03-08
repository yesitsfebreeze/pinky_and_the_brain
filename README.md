```
~ 🧠 PINKY & THE BRAIN  
~ ────────────────────  
~ Persistent cross-project AI memory  
~  
~ This file is a program written in three lanes:  
~  
~   ~   Comment for Reader. AI always ignores these.  
~   @   Installation step. Only runs when @pinky is missing.  
~   !   Skill action. Only runs when PATB_SKILL = TRUE.  
~  
~ To install: fill in the config table, paste this file into an AI chat.  
~ At runtime: the skill fetches this file, extracts ! lines, executes them.  
~  
~ Architecture:  
~
~   {source_root}        sync ─►    {brain_root}  
~   ┌ my-project/          │        ┌ ~/.patb/my-project.patb/  
~   ├── @pinky             │        ├── @brain  
~   └── **/*.*             │        ├── purpose.md  
~                          │        ├── thoughts.md  
~                          │        ├── tree.md  
~                          │        ├── changes.md  
~                          │        └── sync.md  
  
~ █ STEP 0: MODE  
  
! You are in SKILL mode if {PATB_SKILL} is set to TRUE.  
! All ! lines below are your operational instructions. Execute them in order.  
! Ignore lines prefixed with ! or @  
  
@ You are in INSTALLER mode.  
@ Check: does @pinky exist at the workspace root?  
@ If YES: stop — already installed. Offer to re-run installation to update.  
@ If NO: continue with installation.  
  
  
~ █ STEP 1: CONFIGURATION  
~  
~ Users: fill in Current repo URL before pasting into a chat.  
  
@ Read this configuration table. If any required field still contains a  
@ {placeholder}, stop and ask the user to fill it in before continuing.  
@  
@ | Setting           | Value                                                    |  
@ |-------------------|----------------------------------------------------------|  
@ | Skill hub URL     | `https://github.com/yesitsfebreeze/pinky-and-the-brain`  |  
@ | Current repo URL  | `https://github.com/{user}/{repo}`                       |  
@ | Max notes         | `64`                                                     |  
@ | Min rating        | `30`                                                     |  
@ | Avoid (optional)  |                                                          |  
@ | Follow (optional) |                                                          |  

! Read configuration from {brain_root}/@brain:  
!   - Parse `main-brain-origin-source-url` from the HTML comment  
!   - Parse YAML: skill_hub_url, follow, avoid, max_notes, min_rating  
!   - Apply follow/avoid as session constraints  
!   - Defaults if missing: max_notes=64, min_rating=30  
  
  
~ █ STEP 2: DRY RUN GATE  
~  
~ To do a dry run, uncomment the @ block below before pasting.  
~ In dry-run mode the AI simulates every step but writes nothing.  
  
~ @ DRY RUN MODE IS ACTIVE.  
~ @ Simulate every step. Do not write, delete, or modify any files.  
~ @ Report exactly what would have happened.  
  
  
~ █ STEP 3: RESOLVE IDENTITY  
~  
~ Every project gets a slug derived from its repo URL.  
~ The brain repo lives at ~/.patb/{slug}.patb/  
  
@ Derive {slug} from Current repo URL:  
@   last path segment → strip .git → lowercase → replace non-alphanumeric (except - _) with -  
@ Set brain repo URL = {current-repo-url}.patb  
@ Set brain root = ~/.patb/{slug}.patb/  
  
! Determine source repo URL: `git remote get-url origin` (fallback to @pinky line 1)  
! Derive {slug}: last path segment → strip .git → lowercase → sanitize  
! Derive brain repo URL: {source-repo-url}.patb  
! Set brain root = ~/.patb/{slug}.patb/  
  
  
~ █ STEP 4: SKILL BOOTSTRAP  
~  
~ The installed skill sets PATB_SKILL = TRUE and points at this file's URL.  
~ It lives at ~/.agents/skills/pinky-memory/SKILL.md  
  
@ Create directory ~/.agents/skills/pinky-memory/ if it doesn't exist.  
@ Write the following verbatim to ~/.agents/skills/pinky-memory/SKILL.md  
@ (overwrite if it exists). Content between --- BEGIN / --- END:  
@  
@ --- BEGIN SKILL.md ---  
@ ---  
@ name: pinky-memory  
@ description: >  
@   Manage cross-repository AI memory with per-project brain repos ({slug}.patb).  
@   Use when a repo has @pinky and @brain files, to sync memory, capture  
@   decisions/pitfalls/useful notes into a rated note pool (thoughts.md), and persist  
@   them in the project's dedicated brain repo. Also triggers on: "remember this",  
@   "what do you know about", decisions/pitfalls capture, memory sync requests.  
@ argument-hint: 'Optional: focus area or file path (e.g. "auth refactor" or "src/main.ts")'  
@ user-invocable: true  
@ disable-model-invocation: false  
@ ---  
@  
@ PATB_SKILL = TRUE  
@  
@ Read and execute: https://raw.githubusercontent.com/yesitsfebreeze/pinky-and-the-brain/refs/heads/main/README.md  
@ --- END SKILL.md ---  
  
  
~ █ STEP 5: BRAIN REPO  
~  
~ Each project gets a companion .patb brain repo.  
~ It stores all AI memory for that project.  
  
@ Ensure ~/.patb/ directory exists.  
@ If ~/.patb/{slug}.patb/.git already exists: keep it, already set up.  
@ Otherwise: git clone {current-repo-url}.patb ~/.patb/{slug}.patb/  
@ If clone fails (remote doesn't exist):  
@   Tell user to create {current-repo-url}.patb on their git host.  
@   Fallback: mkdir -p ~/.patb/{slug}.patb/ && git -C ~/.patb/{slug}.patb/ init  
  
! Sync brain repo:  
!   If ~/.patb/{slug}.patb/.git does not exist:  
!     git clone {brain-repo-url} ~/.patb/{slug}.patb/  
!   If it exists:  
!     Verify remote matches expected URL  
!     Check for uncommitted changes: git -C {brain_root} status --porcelain  
!     If changes: git add -A && commit "pb: update ({n} notes)" → pull --rebase → push  
!     If clean: git -C {brain_root} pull --rebase  
!   If working inside a .patb repo directly: use cwd as brain root, skip clone/pull  
  
  
~ █ STEP 6: @brain  
~  
~ @brain holds project identity for the brain repo:  
~ origin URL (HTML comment), title, description, YAML settings.  
  
@ Write {brain_root}/@brain:  
@  
@   <!-- main-brain-origin-source-url: {current-repo-url} -->  
@   # {title derived from source README}  
@  
@   {short project description}  
@  
@   ```yaml  
@   skill_hub_url: {skill-hub-url}  
@   follow:  
@     - {follow items from config}  
@   avoid:  
@     - {avoid items from config}  
@   max_notes: {max-notes}  
@   min_rating: {min-rating}  
@   ```  
@  
@ Rules:  
@   - Omit empty follow/avoid lists entirely.  
@   - Use defaults: max_notes=64, min_rating=30.  
@   - If file exists + valid: preserve user content, only fill missing fields.  
@   - If file exists but empty/invalid: overwrite.  
  
! Read {brain_root}/@brain:  
!   Parse `main-brain-origin-source-url` from the HTML comment  
!   Parse YAML: skill_hub_url, follow, avoid, max_notes, min_rating  
!   Apply follow/avoid as session constraints  
!   Defaults: max_notes=64, min_rating=30  
! If @brain is missing or invalid (empty, no origin comment, no YAML):  
!   Create/repair it using canonical format above.  
  
  
~ █ STEP 7: @pinky  
~  
~ @pinky lives at the source repo root.  
~ Line 1 = repo URL. Lines 2+ = linked .patb brain repos.  
  
@ Create {source_root}/@pinky:  
@   Line 1: Current repo URL from configuration table  
@   Lines 2+: empty (user adds linked repos later)  
@ Skip if @pinky already exists.  
@ Skip if URL still contains {user} or {repo} placeholders.  
  
! Read {source_root}/@pinky:  
!   Line 1: current repo URL  
!   Lines 2+: linked .patb repo URLs  
! If missing: create with URL from `git remote get-url origin` on line 1.  
  
  
~ █ STEP 8: ALWAYS-ACTIVE INSTRUCTIONS  
~  
~ These make the AI auto-load memory at the start of every session.  

```  
@ Detect the AI environment using the first matching indicator:  
@  
@ | Environment              | Detection                                            | Install path                                    | Format                         |  
@ |--------------------------|------------------------------------------------------|-------------------------------------------------|--------------------------------|  
@ | VS Code + GitHub Copilot | run_vscode_command tool + ~/.config/Code/ exists     | {VS Code user prompts dir}/pb.instructions.md   | applyTo: "**" frontmatter      |  
@ | Cursor                   | ~/.cursor/ exists                                    | ~/.cursor/rules/pb-memory.mdc                   | alwaysApply: true frontmatter  |  
@ | Windsurf                 | ~/.windsurf/ exists                                  | ~/.windsurf/rules/pb-memory.md                  | No frontmatter                 |  
@ | Claude Code              | ~/.claude/ exists                                    | Append to ~/.claude/CLAUDE.md                   | No frontmatter                 |  
@ | Cline / RooCode          | ~/.cline/ exists                                     | ~/.cline/rules/pb-memory.md                     | No frontmatter                 |  
@ | Unknown                  | none matched                                         | ~/.agents/instructions/pb-memory.md             | No frontmatter; warn user      |  
```
@  
@ Write to the detected path (adapt frontmatter to environment):  
@  
@   # Pinky & the Brain (p&b)  
@  
@   You have persistent cross-project memory powered by per-project brain repos.  
@   Active when @pinky exists at workspace root.  
@   Invoke the `pinky-memory` skill for all memory operations.  
@  
@   ## Quick Reference  
@   - @brain: {brain_root}/@brain — origin URL, title, YAML config  
@   - @pinky: {source_root}/@pinky — repo URL (line 1), linked repos (lines 2+)  
@   - Brain repo: {repo-url}.patb → ~/.patb/{slug}.patb/  
@   - Memory files: purpose.md, thoughts.md, tree.md, changes.md (in .patb)  
@   - Slug: last URL path segment, strip .git, lowercase, sanitize  
@  
@   ## Session Lifecycle  
@   Start: sync brain → read @brain + @pinky → load memory → check linked repos  
@   Runtime: invoke skill for remember/forget/query/list  
@  
@   ## Commands  
@   - "what do you know about X" → search thoughts.md + linked repos  
@   - "remember that..." → rate + store note, commit & push  
@   - "forget about..." → remove note, commit & push  
@   - "list brain contents" → show all brain repos + note counts  
  
  
~ █ STEP 9: MEMORY INIT / LOAD  
~  
~ Memory files live in the brain repo. First run creates them empty.  
~ Subsequent runs load existing content.  
  
@ Create starter files if they don't exist yet:  
@  
@ {brain_root}/purpose.md:  
@   # {slug}  
@   {1–3 sentence description inferred from README, config, entry points}  
@  
@ {brain_root}/thoughts.md:  
@   # Thoughts  
@   <!-- scored notes are added here over time -->  
@  
@ {brain_root}/tree.md:  
@   # File Tree  
@   <!-- generated from source repository files -->  
@  
@ {brain_root}/changes.md:  
@   # Changes  
@   <!-- cross-project-relevant changes are logged here -->  
@  
@ {brain_root}/sync.md:  
@   # Sync State  
@   source_branch: main  
@   source_head: {current-commit-hash}  
@   indexed_at: {now-ISO8601}  
  
! Load memory:  
!   Read {brain_root}/purpose.md — project purpose and scope  
!   Read {brain_root}/thoughts.md — rated note pool  
!   Read {brain_root}/tree.md — file tree with impact ratings  
!  
! If any memory file is missing (first sync / register):  
!   Infer purpose from README.md, config files, entry points  
!   Write purpose.md with 1–3 sentence description  
!   Write thoughts.md (empty pool)  
!   Write tree.md (empty)  
!   Write changes.md (empty)  
!   Write sync.md with current source head  
  
  
~ █ STEP 10: CATCH-UP & CROSS-PROJECT  
~  
~ On each session start, the skill catches up on any source pushes  
~ that happened since the last sync, then checks linked repos.  
  
! Catch up source pushes:  
!   Determine default branches: prefer main, fallback master (for both repos)  
!   git -C {source_root} fetch origin --prune  
!   git -C {brain_root} fetch origin --prune  
!   If brain local is behind origin: pull --rebase first  
!   Read source head hash/timestamp from origin/{source_branch}  
!   Read indexed hash/timestamp from {brain_root}/sync.md (create if missing)  
!   If source is newer than indexed:  
!     Index all commits since indexed hash into thoughts.md, tree.md, changes.md  
!     Update sync.md with new hash + timestamp  
!     Commit and push brain immediately  
!  
! Cross-project context (for each linked .patb URL in @pinky lines 2+):  
!   Check for local clone at ~/.patb/{link-slug}.patb/  
!   If present: read purpose.md  
!   If not present: fetch purpose.md via raw URL:  
!     GitHub: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/purpose.md  
!     GitLab: https://gitlab.com/{owner}/{repo}/-/raw/{branch}/purpose.md  
!     Other: use host's raw endpoint for {default-branch}  
!   Default branch detection: git symbolic-ref, or try main then master  
!   Read changes.md — surface entries from last 7 days or since last pull  
!   If project is relevant to current session: sub-search thoughts.md  
!   If not relevant: skip to next  
!   Surface useful cross-project context and recent changes  
  
  
~ █ STEP 11: COMMANDS  
  
~ "what do you know about X"  
! QUERY:  
!   1. Read {brain_root}/purpose.md and thoughts.md  
!   2. Search notes for the topic  
!   3. For each linked .patb in @pinky:  
!      Read purpose.md — skip if project not relevant to query  
!      If relevant: sub-search that repo's thoughts.md  
!   4. Present findings concisely — cite which brain repo each came from  
  
~ "list brain contents"  
! LIST:  
!   1. List all *.patb/ directories under ~/.patb/  
!   2. For each: read purpose.md + thoughts.md → show name, purpose, note count  
!   3. If specific slug given: show all notes with ratings  
  
~ "remember that..."  
! REMEMBER:  
!   1. Open {brain_root}/thoughts.md  
!   2. Rate new note 0–100 based on usefulness  
!   3. If below min_rating: inform user, don't store (unless they insist)  
!   4. If pool is at max_notes:  
!      - Similar note with lower rating? → replace it (merge text, keep higher rating)  
!      - New rating > lowest existing? → drop lowest  
!      - New rating < all existing? → inform user, don't store (unless they insist)  
!   5. Append or merge note with its rating  
!   6. Re-sort by rating (highest first)  
!   7. Commit and push:  
!      git -C {brain_root} pull --rebase  
!      git -C {brain_root} add -A  
!      git -C {brain_root} diff --cached --quiet || git -C {brain_root} commit -m "pb: remember - {summary}"  
!      git -C {brain_root} push  
  
~ "forget about..."  
! FORGET:  
!   1. Search {brain_root}/thoughts.md for matching notes  
!   2. Show matches, ask for confirmation  
!   3. Remove confirmed notes  
!   4. Re-sort by rating (highest first)  
!   5. Commit and push:  
!      git -C {brain_root} pull --rebase  
!      git -C {brain_root} add -A  
!      git -C {brain_root} diff --cached --quiet || git -C {brain_root} commit -m "pb: forget - {summary}"  
!      git -C {brain_root} push  
  
  
~ █ STEP 12: POST-PUSH  
~  
~ After every git push to the source repo, index the new changes.  
  
! POST-PUSH (mandatory — run immediately after successful source git push):  
!   1. git -C {source_root} fetch origin --prune  
!      git -C {brain_root} fetch origin --prune  
!   2. Resolve branches: main if present, else master (each repo)  
!   3. If brain behind origin/{brain_branch}: pull --rebase  
!   4. Compare source tip hash vs {brain_root}/sync.md indexed hash  
!      If source tip is not newer: stop (nothing to index)  
!   5. Index new commits since last indexed hash:  
!      Extract decisions, pitfalls, conventions, integration-impacting changes  
!      Merge into thoughts.md with rating/threshold/cap rules  
!      Refresh purpose.md and tree.md from current source state  
!      Append cross-project-relevant changes to changes.md (cap 20, newest first)  
!   6. Update {brain_root}/sync.md:  
!      source_branch: {main|master}  
!      source_head: {new-hash}  
!      indexed_at: {now-ISO8601}  
!   7. git -C {brain_root} add -A  
!      git -C {brain_root} diff --cached --quiet || git -C {brain_root} commit -m "pb: index source push - {summary}"  
!      git -C {brain_root} push  
  
  
~ █ STEP 13: NOTE POOL RULES  
~  
~ thoughts.md is a flat pool of rated notes (0–100).  
~ Higher-rated notes survive longer. Low-value notes get displaced.  
  
! Note pool constraints (from @brain YAML, with defaults):  
!   max_notes: 64 — hard cap on pool size  
!   min_rating: 30 — floor, never store below this  
!  
! Each note format:  
!   #### {short title}  
!   <!-- rating: {0–100} -->  
!   {body text}  
!  
! Pool is sorted by rating, highest first.  
! When full: new note must outrank an existing one to enter.  
! Similar note exists at lower rating → merge & replace.  
! No room + not better than worst → reject (inform user).  
  
  
~ █ STEP 14: FILE FORMATS  
~  
~ All memory files live in {brain_root} = ~/.patb/{slug}.patb/  
~  
~ @brain format:  
~   <!-- main-brain-origin-source-url: {url} -->  
~   # Title  
~   Description  
~   ```yaml  
~   skill_hub_url: ...  
~   follow: [...]  
~   avoid: [...]  
~   max_notes: 64  
~   min_rating: 30  
~   ```  
~  
~ @pinky format:  
~   Line 1: source repo URL  
~   Lines 2+: linked .patb repo URLs  
~  
~ thoughts.md:  
~   #### Short title  
~   <!-- rating: 85 -->  
~   Body text.  
~   (sorted highest first)  
~  
~ tree.md:  
~   | File | Access Rate (1–10) | Line Count | Impact (1–10) | Notes |  
~   Access Rate: how often read/edited across sessions (cap 10)  
~   Impact: project importance (1=leaf utility, 10=critical entrypoint)  
~  
~ changes.md:  
~   #### 2026-03-08 — Short title  
~   1–2 sentence body. Newest first. Cap 20 entries.  
~  
~ sync.md:  
~   source_branch: main  
~   source_head: {hash}  
~   indexed_at: {ISO-8601}  
  
! File format reference (for validation and creation):  
!  
! {brain_root}/@brain:  
!   <!-- main-brain-origin-source-url: {url} -->  
!   # {title}  
!   {description}  
!   ```yaml  
!   skill_hub_url: {url}  
!   follow:  
!     - {constraint}  
!   avoid:  
!     - {constraint}  
!   max_notes: {N}  
!   min_rating: {N}  
!   ```  
!  
! {source_root}/@pinky:  
!   Line 1: source repo URL  
!   Lines 2+: linked .patb URLs  
!  
! {brain_root}/purpose.md:  
!   # {slug}  
!   {1–3 sentence purpose}  
!  
! {brain_root}/thoughts.md:  
!   #### {title}  
!   <!-- rating: {0–100} -->  
!   {body}  
!   (sorted highest rating first)  
!  
! {brain_root}/tree.md:  
!   | File | Access Rate (1–10) | Line Count | Impact (1–10) | Notes |  
!  
! {brain_root}/changes.md:  
!   #### {YYYY-MM-DD} — {title}  
!   {1–2 sentence body}  
!   (newest first, cap 20)  
!  
! {brain_root}/sync.md:  
!   source_branch: {main|master}  
!   source_head: {hash}  
!   indexed_at: {ISO-8601}  
  
  
~ █ STEP 15: FAILURE HANDLING  
  
! FAILURES:  
!   1. Invalid @pinky URL → report, ask for correction  
!   2. Clone/pull fails → report command + error, avoid partial writes  
!   3. Brain repo doesn't exist remotely → guide user to create {slug}.patb  
!   4. Path collision / illegal path → sanitize and log mapping  
!   5. Push fails → leave local commit, report, continue  
!   6. Merge conflict on pull --rebase → git rebase --abort, report, leave staged  
!   7. sync.md missing/corrupt → rebuild from current source head, full re-index  
  
  
~ █ STEP 16: CLEANUP  
  
@ Delete this installer file from disk.  
@ If content was pasted as a chat message (no backing file): skip this step.  
@ Installation complete.  
  
~ Done. Your project now has persistent AI memory.  
~ The skill auto-loads on every session via always-active instructions.  
~ Use "remember that...", "what do you know about...", etc. to interact.  
```