"use strict";
/**
 * forget tool — fuzzy-search the note pool and optionally remove matches.
 *
 * Two-phase design (single-tool, MCP-friendly):
 *   Phase 1 (confirmed=false, default): search and return matching notes.
 *   Phase 2 (confirmed=true):           remove the matched notes, commit & push.
 *
 * Input:
 *   query     — search string (matched against title + body)
 *   confirmed — if true, delete matches immediately
 *   ids       — optional: restrict deletion to specific note titles (from phase-1 list)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.forget = forget;
const storage_js_1 = require("../lib/storage.js");
const git_js_1 = require("../lib/git.js");
function scoreMatch(note, query) {
    const q = query.toLowerCase();
    const haystack = `${note.title} ${note.body} ${note.concepts.join(' ')}`.toLowerCase();
    if (haystack.includes(q))
        return 1;
    // Word overlap
    const words = q.split(/\s+/).filter(Boolean);
    const matched = words.filter(w => haystack.includes(w));
    return matched.length / words.length;
}
async function forget(config, args) {
    const pool = (0, storage_js_1.readThoughts)(config.brainRoot);
    const THRESHOLD = 0.4;
    const matches = pool
        .map(note => ({ note, score: scoreMatch(note, args.query) }))
        .filter(({ score }) => score >= THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .map(({ note }) => ({
        title: note.title,
        rating: note.rating,
        snippet: note.body.slice(0, 120).replace(/\n/g, ' '),
    }));
    if (matches.length === 0) {
        return { matches: [], removed: 0, message: `No notes matched "${args.query}".` };
    }
    if (!args.confirmed) {
        return {
            matches,
            removed: 0,
            message: `Found ${matches.length} match(es). Call again with confirmed=true to delete.`,
        };
    }
    // Determine which titles to remove
    const toRemove = new Set(args.ids && args.ids.length > 0
        ? args.ids
        : matches.map(m => m.title));
    const before = pool.length;
    const remaining = pool.filter(n => !toRemove.has(n.title));
    const removed = before - remaining.length;
    (0, storage_js_1.writeThoughts)(config.brainRoot, remaining);
    await (0, git_js_1.syncAndPush)(config.brainRoot, `pb: forget - ${args.query}`);
    return {
        matches,
        removed,
        message: `Removed ${removed} note(s) matching "${args.query}".`,
    };
}
