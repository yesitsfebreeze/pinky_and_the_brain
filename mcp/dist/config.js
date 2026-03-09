"use strict";
/**
 * Configuration resolution for the p&b MCP server.
 *
 * Priority for brain repo URL:
 *   1. PATB_URL from @brain YAML (if brainRoot/@brain exists)
 *   2. Line 1 of {SOURCE_ROOT}/@pinky
 *   3. Derived: {SOURCE_REPO_URL}.patb  (not implemented here — caller must provide SOURCE_REPO_URL)
 *
 * SOURCE_ROOT is determined by (first match):
 *   1. Explicit argument to resolveConfig()
 *   2. PATB_SOURCE_ROOT environment variable
 *   3. process.cwd()
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveSlug = deriveSlug;
exports.brainRootFromUrl = brainRootFromUrl;
exports.resolveConfig = resolveConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const DEFAULTS = {
    maxNotes: 64,
    minRating: 300,
    pruneThreshold: 300,
    maxContextNotes: 8,
    maxContextFiles: 5,
    maxLinkedRepos: 3,
    contextDepth: 2,
};
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function deriveSlug(url) {
    const segment = url.replace(/\/+$/, '').split('/').pop() ?? 'unknown';
    return segment
        .replace(/\.git$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9\-_]/g, '-');
}
function brainRootFromUrl(url) {
    return path_1.default.join(os_1.default.homedir(), '.patb', `${deriveSlug(url)}.patb`);
}
function extractYamlBlock(content) {
    const match = content.match(/```yaml\n([\s\S]*?)```/);
    return match ? match[1] : null;
}
function parseBrainYaml(content) {
    const block = extractYamlBlock(content);
    if (!block)
        return {};
    try {
        return js_yaml_1.default.load(block) ?? {};
    }
    catch {
        return {};
    }
}
function str(v) {
    return typeof v === 'string' ? v : undefined;
}
function num(v, fallback) {
    return typeof v === 'number' ? v : fallback;
}
function strArr(v) {
    if (!Array.isArray(v))
        return [];
    return v.filter((x) => typeof x === 'string');
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Resolve the full p&b configuration from a given source root.
 *
 * This is a synchronous operation — all files are read with fs.readFileSync.
 * Suitable for use at MCP server startup.
 */
function resolveConfig(sourceRoot) {
    const root = sourceRoot ?? process.env['PATB_SOURCE_ROOT'] ?? process.cwd();
    // Step 1: Read @pinky to get the preliminary brain repo URL
    const pinkyPath = path_1.default.join(root, '@pinky');
    let preliminaryBrainUrl = '';
    if (fs_1.default.existsSync(pinkyPath)) {
        const lines = fs_1.default.readFileSync(pinkyPath, 'utf8').split('\n');
        preliminaryBrainUrl = lines[0]?.trim() ?? '';
    }
    // Step 2: Derive preliminary brainRoot from @pinky line 1
    let brainRoot = brainRootFromUrl(preliminaryBrainUrl);
    // Step 3: Read @brain from preliminary brainRoot to get YAML config + PATB_URL override
    const brainFile = path_1.default.join(brainRoot, '@brain');
    let configYaml = {};
    if (fs_1.default.existsSync(brainFile)) {
        configYaml = parseBrainYaml(fs_1.default.readFileSync(brainFile, 'utf8'));
    }
    // Step 4: If PATB_URL present in @brain YAML, re-derive brainRoot and re-read @brain
    const patbUrl = str(configYaml['PATB_URL']);
    if (patbUrl) {
        brainRoot = brainRootFromUrl(patbUrl);
        const overrideBrainFile = path_1.default.join(brainRoot, '@brain');
        if (fs_1.default.existsSync(overrideBrainFile)) {
            configYaml = parseBrainYaml(fs_1.default.readFileSync(overrideBrainFile, 'utf8'));
        }
    }
    const brainRepoUrl = patbUrl ?? preliminaryBrainUrl;
    return {
        sourceRoot: root,
        brainRoot,
        brainRepoUrl,
        skillUrl: str(configYaml['SKILL_URL']) ?? '',
        patbUrl,
        follow: strArr(configYaml['FOLLOW']),
        avoid: strArr(configYaml['AVOID']),
        maxNotes: num(configYaml['MAX_NOTES'], DEFAULTS.maxNotes),
        minRating: num(configYaml['MIN_RATING'], DEFAULTS.minRating),
        pruneThreshold: num(configYaml['PRUNE_THRESHOLD'], DEFAULTS.pruneThreshold),
        maxContextNotes: num(configYaml['MAX_CONTEXT_NOTES'], DEFAULTS.maxContextNotes),
        maxContextFiles: num(configYaml['MAX_CONTEXT_FILES'], DEFAULTS.maxContextFiles),
        maxLinkedRepos: num(configYaml['MAX_LINKED_REPOS'], DEFAULTS.maxLinkedRepos),
        contextDepth: num(configYaml['CONTEXT_DEPTH'], DEFAULTS.contextDepth),
    };
}
