# p&b Evolution — Actionable TODOs

Evaluation of three proposed additions: Memory Lifecycle, Concept Graph, Context Assembler.
Created 2026-03-08.

---

## Current State Summary

Already implemented in SKILL.md:
- Rating 0–100 on notes, MIN_RATING floor, MAX_NOTES cap, pool replacement
- Score adjustments: +30 used, +50 confirmed, -10 unused, -80 contradicted
- Pool eviction by relevance score: `rating + recency_bonus + repo_match_bonus` (evicts least-relevant when full)
- Pruning: notes below PRUNE_THRESHOLD removed on load and after After Reasoning adjustments
- Note metadata: `created`, `last_used`, `sources`
- Cross-project context via @pinky linked repos

Not yet implemented:
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
Phase 1 (Lifecycle)  ← 1.1–1.3 done; 1.4 prune next
  ↓
Phase 2 (Assembler)  ← needed before note pool exceeds ~30 notes
  ↓
Phase 3 (Graph)      ← start with tags (3.2), not directories (3.5)
  ↓
Phase 4 (Docs)       ← continuous, ship with each phase
```

---

## Open Questions

1. **Confidence vs. rating** — Likely redundant. Rating + usage penalties models trustworthiness. Defer unless scoring proves ambiguous.
2. **Concept auto-tagging reliability** — May need a "confirm tags" user step for remember commands. Auto-tagging during catch-up indexing should be silent.
3. **Cross-repo concept linking** — Should concepts.md reference concepts from linked brain repos? Adds complexity. Defer to post-Phase 3.
4. ~~**Hibernation threshold**~~ — Resolved; no longer applicable without time-based decay.
5. **Migration** — Existing thoughts.md files without `created`/`last_used`: set both to file's last git commit date. Notes without `concepts`: leave blank, tag organically.
6. **Prune threshold independence** — Should PRUNE_THRESHOLD differ from MIN_RATING? Useful if you want to accept notes at 30 but only prune at 15 after score adjustments. Needs testing.
