/**
 * prune tool — remove all notes below PRUNE_THRESHOLD, log deletions, push.
 *
 * Input: (none required — uses PRUNE_THRESHOLD from config)
 *   dryRun — if true, report what would be pruned without modifying files
 */

import { PatbConfig } from '../config.js';
import { readThoughts, writeThoughts, prependChange } from '../lib/storage.js';
import { syncAndPush } from '../lib/git.js';

export interface PruneArgs {
  dryRun?: boolean;
}

export interface PruneResult {
  pruned: Array<{ title: string; rating: number }>;
  remaining: number;
  message: string;
}

export async function prune(config: PatbConfig, args: PruneArgs = {}): Promise<PruneResult> {
  const pool = readThoughts(config.brainRoot);
  const threshold = config.pruneThreshold;

  const toBePruned = pool.filter(n => n.rating < threshold);
  const remaining = pool.filter(n => n.rating >= threshold);

  if (toBePruned.length === 0) {
    return {
      pruned: [],
      remaining: pool.length,
      message: `Nothing to prune — all ${pool.length} notes meet the threshold (${threshold}).`,
    };
  }

  const summary = toBePruned.map(n => ({ title: n.title, rating: n.rating }));

  if (args.dryRun) {
    return {
      pruned: summary,
      remaining: remaining.length,
      message: `[dry-run] Would prune ${toBePruned.length} note(s) below threshold ${threshold}.`,
    };
  }

  writeThoughts(config.brainRoot, remaining);

  const changeBody = toBePruned
    .map(n => `- "${n.title}" (rating: ${n.rating})`)
    .join('\n');
  prependChange(
    config.brainRoot,
    `Pruned ${toBePruned.length} note(s) (threshold ${threshold})`,
    changeBody
  );

  await syncAndPush(config.brainRoot, `pb: prune - removed ${toBePruned.length} notes below ${threshold}`);

  return {
    pruned: summary,
    remaining: remaining.length,
    message: `Pruned ${toBePruned.length} note(s). ${remaining.length} note(s) remain.`,
  };
}
