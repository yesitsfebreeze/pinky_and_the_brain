/**
 * Smoke tests for p&b MCP tools.
 *
 * Uses node:test + node:assert (no extra deps).
 * Set PATB_NO_GIT=1 so syncAndPush becomes a no-op — tests run fully offline.
 *
 * Run:  npm test   (from mcp/)
 */

// Must be set before any tool module is imported so git.ts sees it at load time
process.env.PATB_NO_GIT = '1';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Import tools after patching
import { remember } from '../tools/remember.js';
import { forget } from '../tools/forget.js';
import { query } from '../tools/query.js';
import { prune } from '../tools/prune.js';
import { planAdd, planNext, planComplete } from '../tools/plan.js';
import { PatbConfig } from '../config.js';
import { deriveSlug, brainRootFromUrl, resolveConfig } from '../config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'patb-test-'));
}

function makeConfig(brainRoot: string, sourceRoot: string): PatbConfig {
  return {
    sourceRoot,
    brainRoot,
    brainRepoUrl: 'https://example.com/test.patb',
    skillUrl: '',
    patbUrl: undefined,
    follow: [],
    avoid: [],
    maxNotes: 10,
    minRating: 300,
    pruneThreshold: 300,
    maxContextNotes: 8,
    maxContextFiles: 5,
    maxLinkedRepos: 3,
    contextDepth: 2,
  };
}

// Temp dirs created per-test group
let tmpBrain = '';
let tmpSource = '';
let cfg: PatbConfig;

before(() => {
  tmpBrain = makeTmp();
  tmpSource = makeTmp();
  cfg = makeConfig(tmpBrain, tmpSource);
  // Create a minimal @plan file for plan tool tests
  fs.writeFileSync(
    path.join(tmpSource, '@plan'),
    'ideas above\n\n█████████████████████\n\n'
  );
});

after(() => {
  fs.rmSync(tmpBrain, { recursive: true, force: true });
  fs.rmSync(tmpSource, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

test('config — deriveSlug strips .git and .patb suffixes', () => {
  assert.equal(deriveSlug('https://example.com/acme/my-project.git'), 'my-project');
  assert.equal(deriveSlug('https://example.com/acme/my-project.patb'), 'my-project');
  assert.equal(deriveSlug('https://example.com/acme/my-project.patb.git'), 'my-project');
  assert.equal(deriveSlug('https://example.com/acme/my-project\\.patb'), 'my-project');
  assert.equal(deriveSlug('https://example.com/acme/my-project%2Epatb'), 'my-project');
});

test('config — brainRootFromUrl maps .patb URL to ~/.patb/{slug}.patb', () => {
  const root = brainRootFromUrl('https://example.com/acme/demo.patb');
  assert.equal(root, path.join(os.homedir(), '.patb', 'demo.patb'));
});

test('config — resolveConfig rejects missing @pinky with actionable message', () => {
  const src = makeTmp();
  assert.throws(
    () => resolveConfig(src),
    /Missing @pinky .*brain repos live under ~\/\.patb/i
  );
  fs.rmSync(src, { recursive: true, force: true });
});

test('config — resolveConfig rejects empty @pinky URL line', () => {
  const src = makeTmp();
  fs.writeFileSync(path.join(src, '@pinky'), '\n');
  assert.throws(
    () => resolveConfig(src),
    /Invalid @pinky.*Do not look for @brain in the workspace/i
  );
  fs.rmSync(src, { recursive: true, force: true });
});

test('config — resolveConfig resolves .patb URL under ~/.patb', () => {
  const src = makeTmp();
  fs.writeFileSync(path.join(src, '@pinky'), 'https://example.com/acme/example.patb\n');
  const resolved = resolveConfig(src);

  assert.equal(resolved.sourceRoot, path.resolve(src));
  assert.equal(resolved.brainRoot, path.join(os.homedir(), '.patb', 'example.patb'));

  fs.rmSync(src, { recursive: true, force: true });
});

test('config — resolveConfig normalizes escaped dot in @pinky URL', () => {
  const src = makeTmp();
  fs.writeFileSync(path.join(src, '@pinky'), 'https://example.com/acme/example\\.patb\n');
  const resolved = resolveConfig(src);

  assert.equal(resolved.brainRoot, path.join(os.homedir(), '.patb', 'example.patb'));
  assert.equal(resolved.brainRepoUrl, 'https://example.com/acme/example.patb');

  fs.rmSync(src, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// remember
// ---------------------------------------------------------------------------

test('remember — stores a note above MIN_RATING', async () => {
  const res = await remember(cfg, { title: 'Test note', body: 'Hello world', rating: 500 });
  assert.equal(res.stored, true);
  assert.ok(res.note);
  assert.equal(res.note!.title, 'Test note');
  assert.equal(res.note!.rating, 500);
});

test('remember — rejects note below MIN_RATING', async () => {
  const res = await remember(cfg, { title: 'Low note', body: 'Too low', rating: 100 });
  assert.equal(res.stored, false);
  assert.match(res.message, /MIN_RATING/);
});

test('remember — force flag overrides MIN_RATING', async () => {
  const res = await remember(cfg, { title: 'Forced note', body: 'Forced in', rating: 100, force: true });
  assert.equal(res.stored, true);
});

test('remember — clamps rating to 0–1000', async () => {
  const res = await remember(cfg, { title: 'Clamped note', body: 'Over 9000', rating: 9999, force: true });
  assert.equal(res.stored, true);
  assert.equal(res.note!.rating, 1000);
});

test('remember — stores concepts and sources', async () => {
  const res = await remember(cfg, {
    title: 'Concept note',
    body: 'Has tags',
    rating: 600,
    concepts: 'alpha, beta',
    sources: 'src/foo.ts',
  });
  assert.equal(res.stored, true);
  assert.deepEqual(res.note!.concepts, ['alpha', 'beta']);
  assert.deepEqual(res.note!.sources, ['src/foo.ts']);
});

// ---------------------------------------------------------------------------
// forget
// ---------------------------------------------------------------------------

test('forget — phase 1: finds matches without deleting', async () => {
  // Add a fresh config pointing to a fresh brain so we know exactly what is there
  const brain2 = makeTmp();
  const cfg2 = makeConfig(brain2, tmpSource);
  await remember(cfg2, { title: 'Remove me', body: 'target content', rating: 500 });

  const res = await forget(cfg2, { query: 'target content' });
  assert.ok(res.matches.length > 0);
  assert.equal(res.removed, 0);
  assert.match(res.message, /confirmed=true/i);

  fs.rmSync(brain2, { recursive: true, force: true });
});

test('forget — phase 2: removes matches when confirmed', async () => {
  const brain3 = makeTmp();
  const cfg3 = makeConfig(brain3, tmpSource);
  await remember(cfg3, { title: 'Delete this', body: 'please remove', rating: 500 });

  const res = await forget(cfg3, { query: 'Delete this', confirmed: true });
  assert.equal(res.removed, 1);

  // Verify it is gone from the pool
  const res2 = await forget(cfg3, { query: 'Delete this' });
  assert.equal(res2.matches.length, 0);

  fs.rmSync(brain3, { recursive: true, force: true });
});

test('forget — returns empty result when nothing matches', async () => {
  const res = await forget(cfg, { query: 'xyzzy no match here' });
  assert.equal(res.matches.length, 0);
  assert.equal(res.removed, 0);
});

// ---------------------------------------------------------------------------
// query
// ---------------------------------------------------------------------------

test('query — returns stored notes ranked by relevance', async () => {
  const brain4 = makeTmp();
  const cfg4 = makeConfig(brain4, tmpSource);
  await remember(cfg4, { title: 'Relevant note', body: 'contains the keyword', rating: 700 });
  await remember(cfg4, { title: 'Other note', body: 'unrelated text', rating: 500 });

  const res = await query(cfg4, { query: 'keyword' });
  assert.ok(res.notes.length > 0);
  assert.equal(res.notes[0]!.title, 'Relevant note');

  fs.rmSync(brain4, { recursive: true, force: true });
});

test('query — respects maxResults override', async () => {
  const brain5 = makeTmp();
  const cfg5 = makeConfig(brain5, tmpSource);
  for (let i = 0; i < 5; i++) {
    await remember(cfg5, { title: `Note ${i}`, body: `body ${i}`, rating: 500 });
  }
  const res = await query(cfg5, { query: 'Note', maxResults: 2 });
  assert.ok(res.notes.length <= 2);

  fs.rmSync(brain5, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// prune
// ---------------------------------------------------------------------------

test('prune — dry run reports without modifying', async () => {
  const brain6 = makeTmp();
  const cfg6 = makeConfig(brain6, tmpSource);
  await remember(cfg6, { title: 'Weak note', body: 'below threshold', rating: 200, force: true });
  await remember(cfg6, { title: 'Strong note', body: 'above threshold', rating: 800 });

  const res = await prune(cfg6, { dryRun: true });
  assert.ok(res.pruned.length > 0);
  assert.match(res.message, /dry-run/);

  // File should be unchanged — both notes still there
  const res2 = await query(cfg6, { query: 'Weak note' });
  assert.ok(res2.totalPool === 2);

  fs.rmSync(brain6, { recursive: true, force: true });
});

test('prune — removes notes below threshold', async () => {
  const brain7 = makeTmp();
  const cfg7 = makeConfig(brain7, tmpSource);
  await remember(cfg7, { title: 'Low note', body: 'prunable', rating: 200, force: true });
  await remember(cfg7, { title: 'High note', body: 'keeper', rating: 800 });

  const res = await prune(cfg7, {});
  assert.equal(res.pruned.length, 1);
  assert.equal(res.pruned[0]!.title, 'Low note');
  assert.equal(res.remaining, 1);

  fs.rmSync(brain7, { recursive: true, force: true });
});

test('prune — no-op when pool is clean', async () => {
  const brain8 = makeTmp();
  const cfg8 = makeConfig(brain8, tmpSource);
  await remember(cfg8, { title: 'Safe note', body: 'above threshold', rating: 500 });

  const res = await prune(cfg8, {});
  assert.equal(res.pruned.length, 0);
  assert.match(res.message, /Nothing to prune/);

  fs.rmSync(brain8, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// plan tools
// ---------------------------------------------------------------------------

test('plan_add — appends todo below separator', async () => {
  const src = makeTmp();
  fs.writeFileSync(path.join(src, '@plan'), '█████████████████████\n\n');
  const c = makeConfig(makeTmp(), src);

  const res = await planAdd(c, { todo: 'implement feature X' });
  assert.match(res.message, /implement feature X/);

  const planFile = fs.readFileSync(path.join(src, '@plan'), 'utf8');
  assert.ok(planFile.includes('implement feature X'));

  fs.rmSync(c.brainRoot, { recursive: true, force: true });
  fs.rmSync(src, { recursive: true, force: true });
});

test('plan_next — returns first pending todo', async () => {
  const src = makeTmp();
  fs.writeFileSync(
    path.join(src, '@plan'),
    '█████████████████████\n\n- [ ] first todo\n- [ ] second todo\n'
  );
  const c = makeConfig(makeTmp(), src);

  const res = await planNext(c);
  assert.equal(res.todo, '- [ ] first todo');

  fs.rmSync(c.brainRoot, { recursive: true, force: true });
  fs.rmSync(src, { recursive: true, force: true });
});

test('plan_next — returns null when no todos', async () => {
  const src = makeTmp();
  fs.writeFileSync(path.join(src, '@plan'), '█████████████████████\n\n');
  const c = makeConfig(makeTmp(), src);

  const res = await planNext(c);
  assert.equal(res.todo, null);

  fs.rmSync(c.brainRoot, { recursive: true, force: true });
  fs.rmSync(src, { recursive: true, force: true });
});

test('plan_complete — removes matched todo', async () => {
  const src = makeTmp();
  fs.writeFileSync(
    path.join(src, '@plan'),
    '█████████████████████\n\n- [ ] do the thing\n- [ ] another item\n'
  );
  const c = makeConfig(makeTmp(), src);

  const res = await planComplete(c, { todo: 'do the thing' });
  assert.equal(res.removed, true);
  assert.match(res.matched, /do the thing/);

  const content = fs.readFileSync(path.join(src, '@plan'), 'utf8');
  assert.ok(!content.includes('do the thing'));
  assert.ok(content.includes('another item'));

  fs.rmSync(c.brainRoot, { recursive: true, force: true });
  fs.rmSync(src, { recursive: true, force: true });
});

test('plan_complete — no-op when todo not found', async () => {
  const src = makeTmp();
  fs.writeFileSync(path.join(src, '@plan'), '█████████████████████\n\n- [ ] real todo\n');
  const c = makeConfig(makeTmp(), src);

  const res = await planComplete(c, { todo: 'nonexistent xyzzy' });
  assert.equal(res.removed, false);

  fs.rmSync(c.brainRoot, { recursive: true, force: true });
  fs.rmSync(src, { recursive: true, force: true });
});
