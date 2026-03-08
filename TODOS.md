# p&b Evolution — Actionable TODOs

Evaluation of three proposed additions: Memory Lifecycle, Concept Graph, Context Assembler.
Created 2026-03-08.

---

## Current State Summary

Already implemented in SKILL.md:
- Rating 0–100 on notes, MIN_RATING floor, MAX_NOTES cap, pool replacement
- Score adjustments: +30 used, +50 confirmed, -10 unused, -80 contradicted
- Pool eviction by relevance score: `rating + recency_bonus + repo_match_bonus` (evicts least-relevant when full)
- Pruning: notes below PRUNE_THRESHOLD removed on load, after After Reasoning, and via standalone `prune notes` command
- Note metadata: `created`, `last_used`, `sources`, `concepts`, `related-notes`
- Cross-project context via @pinky linked repos
- Concept tagging: inline `concepts` field on notes; auto-suggested on `remember`
- Concept index: auto-generated `concepts.md` with co-occurrence `related` links
- Concept-aware queries: BFS expansion through `related` links up to `CONTEXT_DEPTH` hops
- Structured concept relationships: direct note-to-note `related-notes` links; suggested on `remember`; cascade-included in query results
- Selective context loading: relevance-ranked, capped by `MAX_CONTEXT_NOTES` and `MAX_CONTEXT_FILES`
- Dual context loading paths: startup (top-N) vs query-time (full pool scan)
- Context Assembly section: explicit prompt assembly rules with configurable limits (MAX_CONTEXT_NOTES, MAX_CONTEXT_FILES, MAX_LINKED_REPOS)

Not yet implemented: nothing in phases 1–3.

---

## Phase 3 — Concept Graph

**Status: 3.1–3.3 complete (2026-03-08). 3.5 deferred pending 2+ weeks of use.**

### 3.5 Full directory structure — deferred
- [ ] Only pursue if 3.1–3.4 prove tags insufficient after ≥2 weeks of use
- [ ] Would add: `concepts/`, `links/`, `projects/` directories
- [ ] Each concept as standalone YAML/MD doc
- [ ] Migration: generate directory tree from concepts.md + tagged notes
- [ ] **Do not implement preemptively**

---

## Phase 4 — Integration & Docs

Done:
- Rating scale bumped to 0–1000; score adjustments ×10 (+300/+500/−100/−800); MIN_RATING default 300; backward-compat migration note added (SKILL.md, SETUP.md, README.md)
- Todo file workflow: SETUP.md creates PLAN.md at source root on install/update; SKILL.md adds "@pinky / do the next todo" command with full separator-based PLAN.md workflow

## Sequencing

```
Phase 1 (Lifecycle)  ✓ complete
  ↓
Phase 2 (Assembler)  ✓ complete
  ↓
Phase 3 (Graph)      ✓ complete (3.1–3.4 + related-notes; 3.5 deferred)
  ↓
Phase 4 (Docs)       ← current phase
```

---

## Open Questions

1. **Confidence vs. rating** — Likely redundant. Rating + usage penalties models trustworthiness. Defer unless scoring proves ambiguous.
2. **Concept auto-tagging reliability** — May need a "confirm tags" user step for remember commands. Auto-tagging during catch-up indexing should be silent.
3. **Cross-repo concept linking** — Should concepts.md reference concepts from linked brain repos? Adds complexity. Defer to post-Phase 3.
4. ~~**Hibernation threshold**~~ — Resolved; no longer applicable without time-based decay.
5. **Migration** — Existing thoughts.md files without `created`/`last_used`: set both to file's last git commit date. Notes without `concepts`: leave blank, tag organically.
6. **Prune threshold independence** — Should PRUNE_THRESHOLD differ from MIN_RATING? Useful if you want to accept notes at 30 but only prune at 15 after score adjustments. Needs testing.
