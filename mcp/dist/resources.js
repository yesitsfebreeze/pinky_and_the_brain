"use strict";
/**
 * MCP resources for p&b — expose memory files as readable resources.
 *
 *   patb://thoughts  — full note pool (thoughts.md)
 *   patb://tree      — file impact map (tree.md)
 *   patb://changes   — changelog (changes.md)
 *   patb://plan      — @plan contents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThoughtsResource = getThoughtsResource;
exports.getTreeResource = getTreeResource;
exports.getChangesResource = getChangesResource;
exports.getPlanResource = getPlanResource;
const storage_js_1 = require("./lib/storage.js");
const note_js_1 = require("./lib/note.js");
async function getThoughtsResource(config) {
    const notes = (0, storage_js_1.readThoughts)(config.brainRoot);
    return {
        uri: 'patb://thoughts',
        mimeType: 'text/markdown',
        text: (0, note_js_1.serializeNotePool)(notes),
    };
}
async function getTreeResource(config) {
    return {
        uri: 'patb://tree',
        mimeType: 'text/markdown',
        text: (0, storage_js_1.readTree)(config.brainRoot) || '# Tree\n\n(empty)',
    };
}
async function getChangesResource(config) {
    return {
        uri: 'patb://changes',
        mimeType: 'text/markdown',
        text: (0, storage_js_1.readChanges)(config.brainRoot) || '# Changes\n\n(empty)',
    };
}
async function getPlanResource(config) {
    const plan = (0, storage_js_1.readPlan)(config.sourceRoot);
    const SEPARATOR = '█████████████████████';
    const text = [
        plan.above,
        SEPARATOR,
        plan.below,
    ].filter(Boolean).join('\n\n') + '\n';
    return {
        uri: 'patb://plan',
        mimeType: 'text/markdown',
        text,
    };
}
