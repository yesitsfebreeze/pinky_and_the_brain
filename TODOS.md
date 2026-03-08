# p&b Evolution — Actionable TODOs

Evaluation of three proposed additions: Memory Lifecycle, Concept Graph, Context Assembler.
Created 2026-03-08.

---

## Current State Summary

The system already has:
- Static rating (0–100) on notes, MIN_RATING floor, MAX_NOTES cap
- Pool replacement logic (lower-rated notes evicted)
- Cross-project context via linked @pinky repos
- Flat note pool (thoughts.md), file tree (tree.md), changelog (changes.md)

What it lacks: notes never decay, no usage tracking, no structured relationships between ideas, no selective context loading.

---

## Phase 1 — Memory Lifecycle

**Priority: High.** Directly improves the existing note pool without new file structures.  
**Risk: Low.** Backward-compatible — extends the note format in thoughts.md.

### 1.2 Time-based decay
- [ ] On session start (during Load Memory), calculate days since `last_used` for each note
- [ ] Apply decay: `rating -= days_since_last_used * 1` (configurable via @brain YAML: `DECAY_RATE: 1`)
- [ ] Add `DECAY_RATE` to @brain YAML defaults in SKILL.md and SETUP.md
- [ ] Cap decay: never reduce below 0

### 1.4 Automatic pruning
- [ ] After decay pass, remove notes where `rating < MIN_RATING`
- [ ] Log pruned notes to changes.md: `#### {DATE} — pruned {N} stale notes`
- [ ] Add `PRUNE_THRESHOLD` to @brain YAML (default: same as MIN_RATING) for independent control

### 1.5 Confidence levels
- [ ] Evaluate whether `confidence` adds value beyond what `rating` already captures
- [ ] If kept: define semantics — `low` (single observation), `medium` (multiple sessions), `high` (confirmed by code/user)
- [ ] If dropped: rating + last_used + decay already models confidence implicitly
- [ ] **Decision needed:** confidence may be redundant with rating. Consider deferring.

---

## Phase 2 — Context Assembler

**Priority: High.** Prevents token waste as note pools and linked repos grow.  
**Risk: Medium.** Changes the core load path — must not break session startup.

### 2.1 Add selection config to @brain YAML
- [ ] New YAML keys with defaults:
  ```yaml
  MAX_CONTEXT_NOTES: 8     # max notes loaded into prompt
  MAX_CONTEXT_FILES: 5     # max tree.md entries surfaced
  MAX_LINKED_REPOS: 3      # max linked repos queried
  CONTEXT_DEPTH: 2         # max link hops (relevant only if concept graph lands)
  ```
- [ ] Update SKILL.md Configuration section and SETUP.md @brain template
- [ ] Existing `MAX_NOTES` stays — it caps storage. New keys cap what enters the prompt.

### 2.2 Implement ranked loading in "Load Memory"
- [ ] Replace "read all of thoughts.md" with:
  1. Parse all notes (title, rating, last_used, sources)
  2. Compute relevance score: `rating + recency_bonus + repo_match_bonus`
     - `recency_bonus`: 20 if used within 3 days, 10 if within 7, 0 otherwise
     - `repo_match_bonus`: 15 if note sources overlap with current repo files
  3. Sort by relevance score descending
  4. Load top `MAX_CONTEXT_NOTES`
- [ ] Update SKILL.md "Load Memory" section with selection algorithm

### 2.3 Implement ranked loading for cross-project context
- [ ] In "Cross-Project Context" step, limit to `MAX_LINKED_REPOS` repos
- [ ] Rank linked repos by: recency of changes.md entries + relevance to current session
- [ ] From each loaded repo, surface at most 3 notes (highest rated)

### 2.4 Query-time refinement
- [ ] For "what do you know about X" command: override selection with topic-filtered search
- [ ] For session startup (no specific query): use general ranking from 2.2
- [ ] Document both paths in SKILL.md

---

## Phase 3 — Concept Graph

**Priority: Medium.** Highest value long-term, but highest implementation cost.  
**Risk: High.** New file structures, new indexing logic, new query paths.  
Depends on Phase 1 (metadata) and Phase 2 (selection) being stable first.

### 3.1 Evaluate minimal viable structure
- [ ] Decide: separate `concepts/` directory vs. inline concept tags in thoughts.md
- [ ] **Recommendation:** Start with inline tags rather than a full directory tree.
  Notes already have titles — adding `<!-- concepts: tile-sorting, gpu-coherence -->` to the metadata line is cheaper than maintaining a parallel file tree.
- [ ] Prototype the tag approach first. If it proves insufficient, escalate to directory structure.

### 3.2 Concept tagging in notes
- [ ] Extend note metadata with `concepts` field:
  ```
  #### bitonic sort for tile ordering
  <!-- rating: 74 | created: 2026-03-08 | last_used: 2026-03-08 | concepts: tile-sorting, gpu-coherence -->
  ```
- [ ] During "remember" command: auto-suggest 1–3 concept tags based on note content
- [ ] During catch-up indexing: auto-tag new notes

### 3.3 Concept index file (lightweight graph)
- [ ] Add `concepts.md` to brain root (alongside thoughts.md):
  ```
  #### tile-sorting
  <!-- related: gpu-coherence, bitonic-sort, front-to-back-compositing -->
  <!-- files: src/gpu/tile_sort.odin, src/render/compositor.odin -->
  <!-- repos: phyons -->
  ```
- [ ] Rebuild concepts.md from note tags on each sync (derived, not manually maintained)
- [ ] Update SKILL.md file formats section

### 3.4 Concept-aware queries
- [ ] Enhance "what do you know about X":
  1. Match X against concept names in concepts.md
  2. Follow `related` links up to CONTEXT_DEPTH hops
  3. Pull notes tagged with matched concepts
  4. Rank and present
- [ ] This replaces pure text search with structured lookup + text search fallback

### 3.5 Full directory structure (deferred)
- [ ] Only pursue if 3.1–3.4 prove the tag approach insufficient
- [ ] Would add: `concepts/`, `links/`, `projects/` directories
- [ ] Each concept file would be a standalone YAML/MD doc
- [ ] Migration path: generate directory from concepts.md + tagged notes
- [ ] **Do not implement until tag approach has been used for ≥2 weeks**

---

## Phase 4 — Integration & Docs

### 4.1 Update SKILL.md
- [ ] All Phase 1 changes: note format, score adjustments, decay, pruning
- [ ] All Phase 2 changes: selection algorithm, config keys, ranked loading
- [ ] Phase 3 changes (once stabilized): concept tags, concepts.md, concept queries

### 4.2 Update SETUP.md
- [ ] New @brain YAML keys and defaults
- [ ] New file templates (concepts.md)
- [ ] Backward compat: UPDATE mode must migrate old note format to new format

### 4.3 Update README.md
- [ ] Document new commands or changed behavior
- [ ] Add concept graph section (once Phase 3 lands)

### 4.4 Version bump
- [ ] Bump skill.version and install.version after each phase ships
- [ ] Tag releases in the p&b repo

---

## Sequencing

```
Phase 1 (Lifecycle)  ←  start here, lowest risk, highest immediate value
  ↓
Phase 2 (Assembler)  ←  needed before note pool grows past ~30 notes
  ↓
Phase 3 (Graph)      ←  only after 1+2 are stable, start with tags not directories
  ↓
Phase 4 (Docs)       ←  continuous, update as each phase ships
```

## Open Questions

1. **Confidence vs. rating** — Is confidence redundant? Rating + decay may already model trustworthiness.
2. **Concept auto-extraction** — How reliable is auto-tagging? May need a "confirm tags" user step.
3. **Cross-repo concept linking** — Should concepts.md link across brain repos? Adds complexity.
4. **Decay during offline** — If a project is untouched for months, should all notes decay to zero? Consider a "hibernation" flag.
5. **Migration** — Existing thoughts.md files have no `created`/`last_used`. Migration strategy: set both to file's last commit date.
