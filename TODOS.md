# p&b Evolution — Actionable TODOs

Evaluation of three proposed additions: Memory Lifecycle, Concept Graph, Context Assembler.
Created 2026-03-08.

---

## Current State Summary

Already implemented in SKILL.md:
- Rating 0–100 on notes, MIN_RATING floor, MAX_NOTES cap, pool replacement
- Score adjustments: +30 used, +50 confirmed, -10 unused, -80 contradicted
- Decay pass on load: `rating -= days_since_last_used * DECAY_RATE` (in-memory)
- Pruning in After Reasoning: notes below MIN_RATING removed after adjustment
- Note metadata: `created`, `last_used`, `sources`
- Cross-project context via @pinky linked repos
- DECAY_RATE configurable in @brain YAML (default: 1)

Not yet implemented:
- Standalone prune pass (separate from After Reasoning)
- Selective context loading (all notes loaded every session)
- Structured concept relationships between notes
- Configurable context limits for prompt assembly

---

## Phase 3 — Concept Graph

**Priority: Medium.** Highest long-term value, highest implementation cost.
**Risk: High.** New file structures, new indexing, new query paths.
**Depends on:** Phase 1 (metadata) and Phase 2 (selection) being stable.

### 3.5 Full directory structure — deferred
- [ ] Only pursue if 3.1–3.4 prove tags insufficient after ≥2 weeks of use
- [ ] Would add: `concepts/`, `links/`, `projects/` directories
- [ ] Each concept as standalone YAML/MD doc
- [ ] Migration: generate directory tree from concepts.md + tagged notes
- [ ] **Do not implement preemptively**

---

## Phase 4 — Integration & Docs

## Sequencing

```
Phase 1 (Lifecycle)  ← 1.1–1.3 done; 1.4 prune + 1.6 hibernation next
  ↓
Phase 2 (Assembler)  ← needed before note pool exceeds ~30 notes
  ↓
Phase 3 (Graph)      ← start with tags (3.2), not directories (3.5)
  ↓
Phase 4 (Docs)       ← continuous, ship with each phase
```

---

## Open Questions

1. **Confidence vs. rating** — Likely redundant. Rating + decay models trustworthiness. Defer unless scoring proves ambiguous.
2. **Concept auto-tagging reliability** — May need a "confirm tags" user step for remember commands. Auto-tagging during catch-up indexing should be silent.
3. **Cross-repo concept linking** — Should concepts.md reference concepts from linked brain repos? Adds complexity. Defer to post-Phase 3.
4. **Hibernation threshold** — 90 days default seems reasonable. Projects with seasonal usage (game jams, tax tools) need this.
5. **Migration** — Existing thoughts.md files without `created`/`last_used`: set both to file's last git commit date. Notes without `concepts`: leave blank, tag organically.
6. **Prune threshold independence** — Should PRUNE_THRESHOLD differ from MIN_RATING? Useful if you want to accept notes at 30 but only prune at 15 after decay. Needs testing.
