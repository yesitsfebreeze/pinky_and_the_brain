"use strict";
/**
 * Atomic read/write helpers for all p&b memory files:
 *   thoughts.md, tree.md, changes.md, @plan
 *
 * Writes are atomic: write to a sibling .tmp file, then rename.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readThoughts = readThoughts;
exports.writeThoughts = writeThoughts;
exports.readTree = readTree;
exports.writeTree = writeTree;
exports.readChanges = readChanges;
exports.prependChange = prependChange;
exports.writeChanges = writeChanges;
exports.readPlan = readPlan;
exports.writePlan = writePlan;
exports.readSync = readSync;
exports.writeSync = writeSync;
exports.readPinky = readPinky;
exports.writePinky = writePinky;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const note_js_1 = require("./note.js");
// ---------------------------------------------------------------------------
// Atomic write primitive
// ---------------------------------------------------------------------------
function writeAtomic(filePath, content) {
    const dir = path_1.default.dirname(filePath);
    const tmp = path_1.default.join(dir, `.${path_1.default.basename(filePath)}.tmp`);
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(tmp, content, 'utf8');
    fs_1.default.renameSync(tmp, filePath);
}
function readFile(filePath) {
    if (!fs_1.default.existsSync(filePath))
        return '';
    return fs_1.default.readFileSync(filePath, 'utf8');
}
// ---------------------------------------------------------------------------
// thoughts.md
// ---------------------------------------------------------------------------
function readThoughts(brainRoot) {
    const content = readFile(path_1.default.join(brainRoot, 'thoughts.md'));
    return content ? (0, note_js_1.parseNotePool)(content) : [];
}
function writeThoughts(brainRoot, notes) {
    writeAtomic(path_1.default.join(brainRoot, 'thoughts.md'), (0, note_js_1.serializeNotePool)(notes));
}
// ---------------------------------------------------------------------------
// tree.md  (raw markdown table, not parsed into a structured type)
// ---------------------------------------------------------------------------
function readTree(brainRoot) {
    return readFile(path_1.default.join(brainRoot, 'tree.md'));
}
function writeTree(brainRoot, content) {
    writeAtomic(path_1.default.join(brainRoot, 'tree.md'), content);
}
// ---------------------------------------------------------------------------
// changes.md  (raw markdown, cap 20 entries enforced on write)
// ---------------------------------------------------------------------------
/** Max entries kept in changes.md */
const MAX_CHANGES = 20;
function readChanges(brainRoot) {
    return readFile(path_1.default.join(brainRoot, 'changes.md'));
}
/**
 * Prepend a new entry and keep at most MAX_CHANGES entries.
 * Entry format: `#### YYYY-MM-DD — {title}\n{body}`
 */
function prependChange(brainRoot, title, body) {
    const date = new Date().toISOString().slice(0, 10);
    const existing = readChanges(brainRoot);
    const newEntry = `#### ${date} — ${title}\n${body}`;
    // Split existing content into entries on '#### ' boundaries (skip header)
    const entries = existing
        .split(/(?=^#### )/m)
        .filter(b => b.trim().startsWith('#### '));
    const capped = [newEntry, ...entries].slice(0, MAX_CHANGES);
    const header = existing.match(/^#[^#].*\n/) ? existing.match(/^#[^#].*\n/)[0] : '# Changes\n';
    writeAtomic(path_1.default.join(brainRoot, 'changes.md'), `${header}\n${capped.join('\n\n')}\n`);
}
function writeChanges(brainRoot, content) {
    writeAtomic(path_1.default.join(brainRoot, 'changes.md'), content);
}
// ---------------------------------------------------------------------------
// @plan
// ---------------------------------------------------------------------------
const PLAN_SEPARATOR = '█████████████████████';
function readPlan(sourceRoot) {
    const content = readFile(path_1.default.join(sourceRoot, '@plan'));
    const sepIdx = content.indexOf(PLAN_SEPARATOR);
    if (sepIdx === -1) {
        return { above: content.trim(), below: '' };
    }
    const above = content.slice(0, sepIdx).trim();
    const below = content.slice(sepIdx + PLAN_SEPARATOR.length).trim();
    return { above, below };
}
function writePlan(sourceRoot, plan) {
    const parts = [];
    if (plan.above)
        parts.push(plan.above);
    parts.push(PLAN_SEPARATOR);
    if (plan.below)
        parts.push(plan.below);
    writeAtomic(path_1.default.join(sourceRoot, '@plan'), parts.join('\n\n') + '\n');
}
function readSync(brainRoot) {
    const content = readFile(path_1.default.join(brainRoot, 'sync.md'));
    if (!content)
        return null;
    const get = (key) => content.match(new RegExp(`^${key}:\\s*(.+)`, 'm'))?.[1]?.trim() ?? '';
    return {
        sourceBranch: get('SOURCE_BRANCH'),
        sourceHead: get('SOURCE_HEAD'),
        indexedAt: get('INDEXED_AT'),
    };
}
function writeSync(brainRoot, state) {
    const content = [
        `SOURCE_BRANCH: ${state.sourceBranch}`,
        `SOURCE_HEAD: ${state.sourceHead}`,
        `INDEXED_AT: ${state.indexedAt}`,
    ].join('\n') + '\n';
    writeAtomic(path_1.default.join(brainRoot, 'sync.md'), content);
}
// ---------------------------------------------------------------------------
// @pinky helpers
// ---------------------------------------------------------------------------
const HOME = os_1.default.homedir();
function readPinky(sourceRoot) {
    const content = readFile(path_1.default.join(sourceRoot, '@pinky'));
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    // First URL line is the brain repo
    const brainRepoUrl = lines[0] ?? '';
    // Remaining lines: URL lines are linked repos; STATUS: {mode} is the status
    let status = null;
    const linkedRepos = [];
    for (const line of lines.slice(1)) {
        const statusMatch = line.match(/^STATUS:\s*(.+)$/i);
        if (statusMatch) {
            status = statusMatch[1].trim();
        }
        else if (line.startsWith('http') || line.startsWith('git@')) {
            linkedRepos.push(line);
        }
    }
    return { brainRepoUrl, linkedRepos, status };
}
function writePinky(sourceRoot, pinky) {
    const lines = [pinky.brainRepoUrl];
    if (pinky.status)
        lines.push(`STATUS: ${pinky.status}`);
    lines.push(...pinky.linkedRepos);
    writeAtomic(path_1.default.join(sourceRoot, '@pinky'), lines.join('\n') + '\n');
}
