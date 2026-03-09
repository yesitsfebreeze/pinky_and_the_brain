"use strict";
/**
 * prune tool — remove all notes below PRUNE_THRESHOLD, log deletions, push.
 *
 * Input: (none required — uses PRUNE_THRESHOLD from config)
 *   dryRun — if true, report what would be pruned without modifying files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prune = prune;
const storage_js_1 = require("../lib/storage.js");
const git_js_1 = require("../lib/git.js");
async function prune(config, args = {}) {
    const pool = (0, storage_js_1.readThoughts)(config.brainRoot);
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
    (0, storage_js_1.writeThoughts)(config.brainRoot, remaining);
    const changeBody = toBePruned
        .map(n => `- "${n.title}" (rating: ${n.rating})`)
        .join('\n');
    (0, storage_js_1.prependChange)(config.brainRoot, `Pruned ${toBePruned.length} note(s) (threshold ${threshold})`, changeBody);
    await (0, git_js_1.syncAndPush)(config.brainRoot, `pb: prune - removed ${toBePruned.length} notes below ${threshold}`);
    return {
        pruned: summary,
        remaining: remaining.length,
        message: `Pruned ${toBePruned.length} note(s). ${remaining.length} note(s) remain.`,
    };
}
