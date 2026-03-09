"use strict";
/**
 * query tool — retrieve the top-N relevant notes for a given topic.
 *
 * Relevance formula (from CONTEXT.md):
 *   relevance = rating
 *             + recency_bonus    (+20 if last_used ≤ 3 days, +10 if ≤ 7 days)
 *             + repo_match_bonus (+15 if any source file exists under sourceRoot)
 *
 * Concept expansion:
 *   BFS up to CONTEXT_DEPTH hops on the concept graph (concepts.md) to expand
 *   the matched concept set, then boost notes that share any expanded concept.
 *
 * Input:
 *   query      — search text
 *   maxResults — override MAX_CONTEXT_NOTES
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_js_1 = require("../lib/storage.js");
function parseConceptsFile(content) {
    const map = new Map();
    const blocks = content.split(/(?=^#### )/m).filter(b => b.trim().startsWith('#### '));
    for (const block of blocks) {
        const lines = block.split('\n');
        const tag = lines[0].slice(5).trim();
        const relatedLine = lines.find(l => l.includes('related:'));
        const related = relatedLine
            ? relatedLine.replace(/.*related:\s*/, '').replace(/-->/, '').trim().split(',').map(s => s.trim()).filter(Boolean)
            : [];
        map.set(tag, { related });
    }
    return map;
}
function expandConcepts(seeds, graph, depth) {
    const visited = new Set(seeds);
    let frontier = [...seeds];
    for (let d = 0; d < depth; d++) {
        const next = [];
        for (const tag of frontier) {
            for (const neighbour of graph.get(tag)?.related ?? []) {
                if (!visited.has(neighbour)) {
                    visited.add(neighbour);
                    next.push(neighbour);
                }
            }
        }
        if (next.length === 0)
            break;
        frontier = next;
    }
    return visited;
}
// ---------------------------------------------------------------------------
// Recency helpers
// ---------------------------------------------------------------------------
function daysSince(dateStr) {
    if (!dateStr)
        return null;
    const d = Date.parse(dateStr);
    if (isNaN(d))
        return null;
    return Math.floor((Date.now() - d) / 86_400_000);
}
function recencyBonus(note) {
    const days = daysSince(note.lastUsed);
    if (days === null)
        return 0;
    if (days <= 3)
        return 20;
    if (days <= 7)
        return 10;
    return 0;
}
function repoMatchBonus(note, sourceRoot) {
    for (const src of note.sources) {
        if (fs_1.default.existsSync(path_1.default.join(sourceRoot, src)))
            return 15;
    }
    return 0;
}
// ---------------------------------------------------------------------------
// Text match score
// ---------------------------------------------------------------------------
function textScore(note, query) {
    const q = query.toLowerCase();
    const text = `${note.title} ${note.body} ${note.concepts.join(' ')}`.toLowerCase();
    if (text.includes(q))
        return 1;
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length === 0)
        return 0;
    const matched = words.filter(w => text.includes(w));
    return matched.length / words.length;
}
// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
async function query(config, args) {
    const maxResults = args.maxResults ?? config.maxContextNotes;
    const pool = (0, storage_js_1.readThoughts)(config.brainRoot);
    // Load concept graph if available
    const conceptsPath = path_1.default.join(config.brainRoot, 'concepts.md');
    const conceptsContent = fs_1.default.existsSync(conceptsPath)
        ? fs_1.default.readFileSync(conceptsPath, 'utf8')
        : '';
    const graph = parseConceptsFile(conceptsContent);
    // Query concept seeds from the query text (simple word match against known concepts)
    const queryLower = args.query.toLowerCase();
    const seedConcepts = [...graph.keys()].filter(tag => queryLower.includes(tag.toLowerCase()));
    const expandedConcepts = expandConcepts(seedConcepts, graph, config.contextDepth);
    const TEXT_THRESHOLD = 0.2;
    const scored = pool
        .map(note => {
        const ts = textScore(note, args.query);
        // Concept boost: +0.3 for any expanded concept match
        const conceptBoost = note.concepts.some(c => expandedConcepts.has(c)) ? 0.3 : 0;
        const textMatch = ts + conceptBoost;
        if (textMatch < TEXT_THRESHOLD)
            return null;
        const relevance = note.rating +
            recencyBonus(note) +
            repoMatchBonus(note, config.sourceRoot);
        return { note, relevance, textMatch };
    })
        .filter((x) => x !== null)
        .sort((a, b) => {
        // Primary: text match (so query-relevant notes surface first)
        // Secondary: relevance score
        const dt = b.textMatch - a.textMatch;
        return dt !== 0 ? dt : b.relevance - a.relevance;
    })
        .slice(0, maxResults);
    const notes = scored.map(({ note, relevance }) => ({
        title: note.title,
        rating: note.rating,
        relevance,
        concepts: note.concepts,
        body: note.body,
    }));
    return {
        notes,
        totalPool: pool.length,
        message: scored.length > 0
            ? `Found ${scored.length} relevant note(s) (pool: ${pool.length}).`
            : `No notes matched "${args.query}".`,
    };
}
