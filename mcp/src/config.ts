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

import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';

export interface PatbConfig {
	/** Absolute path to the source (workspace) root */
	sourceRoot: string;
	/** Absolute path to the brain repo local clone (~/.patb/{slug}.patb) */
	brainRoot: string;
	/** Remote URL of the brain repo */
	brainRepoUrl: string;
	skillUrl: string;
	patbUrl: string | undefined;
	follow: string[];
	avoid: string[];
	maxNotes: number;
	minRating: number;
	pruneThreshold: number;
	maxContextNotes: number;
	maxContextFiles: number;
	maxLinkedRepos: number;
	contextDepth: number;
}

const DEFAULTS = {
	maxNotes: 64,
	minRating: 300,
	pruneThreshold: 300,
	maxContextNotes: 8,
	maxContextFiles: 5,
	maxLinkedRepos: 3,
	contextDepth: 2,
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeRepoUrl(url: string): string {
	let normalized = url.trim();

	// Accept URLs that were escaped in markdown/JSON contexts.
	normalized = normalized
		.replace(/^(['"])(.*)\1$/, '$2')
		.replace(/\\\//g, '/')
		.replace(/\\\./g, '.')
		.replace(/%2e/gi, '.');

	return normalized;
}

export function deriveSlug(url: string): string {
	const segment = normalizeRepoUrl(url).replace(/\/+$/, '').split('/').pop() ?? 'unknown';
	const stripped = segment.replace(/(\.patb|\.git)+$/gi, '');
	const slug = stripped
		.toLowerCase()
		.replace(/[^a-z0-9\-_]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'unknown';
}

export function brainRootFromUrl(url: string): string {
	return path.join(os.homedir(), '.patb', `${deriveSlug(url)}.patb`);
}

function extractYamlBlock(content: string): string | null {
	const match = content.match(/```yaml\n([\s\S]*?)```/);
	return match ? match[1] : null;
}

function parseBrainYaml(content: string): Record<string, unknown> {
	const block = extractYamlBlock(content);
	if (!block) return {};
	try {
		return (yaml.load(block) as Record<string, unknown>) ?? {};
	} catch {
		return {};
	}
}

function str(v: unknown): string | undefined {
	return typeof v === 'string' ? v : undefined;
}

function num(v: unknown, fallback: number): number {
	return typeof v === 'number' ? v : fallback;
}

function strArr(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is string => typeof x === 'string');
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
export function resolveConfig(sourceRoot?: string): PatbConfig {
	const root = path.resolve(sourceRoot ?? process.env['PATB_SOURCE_ROOT'] ?? process.cwd());
	const expectedBrainBase = path.resolve(path.join(os.homedir(), '.patb'));

	// Step 1: Read @pinky to get the preliminary brain repo URL
	const pinkyPath = path.join(root, '@pinky');
	if (!fs.existsSync(pinkyPath)) {
		throw new Error(
			`Missing @pinky at source root (${pinkyPath}). ` +
			`SOURCE_ROOT must be the workspace repo root, and brain repos live under ~/.patb (not the repo root).`
		);
	}
	let preliminaryBrainUrl = '';
	const lines = fs.readFileSync(pinkyPath, 'utf8').split('\n');
	preliminaryBrainUrl = normalizeRepoUrl(lines[0] ?? '');
	if (!preliminaryBrainUrl) {
		throw new Error(
			`Invalid @pinky: first line must be this project's brain repo URL (${pinkyPath}). ` +
			`Do not look for @brain in the workspace; brain repos are under ~/.patb/{slug}.patb.`
		);
	}

	// Step 2: Derive preliminary brainRoot from @pinky line 1
	let brainRoot = brainRootFromUrl(preliminaryBrainUrl);

	// Step 3: Read @brain from preliminary brainRoot to get YAML config + PATB_URL override
	const brainFile = path.join(brainRoot, '@brain');
	let configYaml: Record<string, unknown> = {};
	if (fs.existsSync(brainFile)) {
		configYaml = parseBrainYaml(fs.readFileSync(brainFile, 'utf8'));
	}

	// Step 4: If PATB_URL present in @brain YAML, re-derive brainRoot and re-read @brain
	const rawPatbUrl = str(configYaml['PATB_URL']);
	const patbUrl = rawPatbUrl ? normalizeRepoUrl(rawPatbUrl) : undefined;
	if (patbUrl) {
		brainRoot = brainRootFromUrl(patbUrl);
		const overrideBrainFile = path.join(brainRoot, '@brain');
		if (fs.existsSync(overrideBrainFile)) {
			configYaml = parseBrainYaml(fs.readFileSync(overrideBrainFile, 'utf8'));
		}
	}

	const resolvedBrainRoot = path.resolve(brainRoot);
	const isUnderPatb =
		resolvedBrainRoot === expectedBrainBase ||
		resolvedBrainRoot.startsWith(`${expectedBrainBase}${path.sep}`);
	if (!isUnderPatb) {
		throw new Error(
			`Resolved brain root is outside ~/.patb (${resolvedBrainRoot}). ` +
			`Expected a path under ${expectedBrainBase}.`
		);
	}

	const brainRepoUrl = patbUrl ?? preliminaryBrainUrl;

	return {
		sourceRoot: root,
		brainRoot: resolvedBrainRoot,
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
