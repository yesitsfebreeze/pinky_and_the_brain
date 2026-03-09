/**
 * sync tool — pull --rebase the brain repo, then push; report what changed.
 *
 * Input: (none)
 */

import { PatbConfig } from '../config.js';
import { pullRebase, commitAndPush, fileLastCommitDate } from '../lib/git.js';
import { readThoughts, writeThoughts } from '../lib/storage.js';
import { brainRootFromUrl } from '../config.js';
import { migrateNotePool } from '../lib/note.js';
import simpleGit from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';

export interface SyncResult {
	pulled: boolean;
	pushed: boolean;
	migrated: number;
	indexedRepo: boolean;
	message: string;
}

const GLOBAL_INDEX_URL = 'https://github.com/yesitsfebreeze/pinky-and-the-brain.patb';

function getSourceRepoUrl(brainRoot: string): string {
	const brainPath = path.join(brainRoot, '@brain');
	if (!fs.existsSync(brainPath)) return '';
	const content = fs.readFileSync(brainPath, 'utf8');
	return content.match(/main-brain-origin-source-url:\s*(.+?)\s*-->/)?.[1]?.trim() ?? '';
}

function readCatalog(filePath: string): string {
	if (!fs.existsSync(filePath)) {
		return [
			'# p&b Repo Catalog',
			'',
			'| Repo URL | Brain URL | Slug | Last Seen |',
			'|---|---|---|---|',
			'',
		].join('\n');
	}
	return fs.readFileSync(filePath, 'utf8');
}

function upsertCatalog(content: string, repoUrl: string, brainUrl: string): string {
	const slug = repoUrl.replace(/\/+$/, '').split('/').pop()?.replace(/\.git$/, '') ?? 'unknown';
	const today = new Date().toISOString().slice(0, 10);
	const line = `| ${repoUrl} | ${brainUrl} | ${slug} | ${today} |`;
	const lines = content.split('\n');

	const existingIdx = lines.findIndex(l => l.includes(`| ${repoUrl} |`));
	if (existingIdx >= 0) {
		lines[existingIdx] = line;
		return `${lines.join('\n').replace(/\n*$/, '\n')}`;
	}

	// Insert after header separator if present, else append.
	const sepIdx = lines.findIndex(l => l.trim() === '|---|---|---|---|');
	if (sepIdx >= 0) {
		lines.splice(sepIdx + 1, 0, line);
	} else {
		lines.push(line);
	}
	return `${lines.join('\n').replace(/\n*$/, '\n')}`;
}

async function updateGlobalRepoCatalog(config: PatbConfig): Promise<boolean> {
	const sourceRepoUrl = getSourceRepoUrl(config.brainRoot);
	if (!sourceRepoUrl) return false;

	const globalRoot = brainRootFromUrl(GLOBAL_INDEX_URL);
	const globalGitDir = path.join(globalRoot, '.git');

	if (!fs.existsSync(globalGitDir)) {
		try {
			fs.mkdirSync(path.dirname(globalRoot), { recursive: true });
			await simpleGit().clone(GLOBAL_INDEX_URL, globalRoot);
		} catch {
			return false;
		}
	}

	try {
		await pullRebase(globalRoot);
	} catch {
		return false;
	}

	const catalogPath = path.join(globalRoot, 'repos.md');
	const current = readCatalog(catalogPath);
	const next = upsertCatalog(current, sourceRepoUrl, config.brainRepoUrl);
	if (next === current) return true;

	fs.writeFileSync(catalogPath, next, 'utf8');
	try {
		await commitAndPush(globalRoot, `pb: catalog repo ${sourceRepoUrl}`);
	} catch {
		return false;
	}
	return true;
}

export async function sync(config: PatbConfig): Promise<SyncResult> {
	const brainRoot = path.resolve(config.brainRoot);
	if (!fs.existsSync(brainRoot)) {
		throw new Error(`Brain repo directory does not exist (brainRoot=${brainRoot}, cwd=${process.cwd()})`);
	}
	if (!fs.statSync(brainRoot).isDirectory()) {
		throw new Error(`Brain repo path is not a directory (brainRoot=${brainRoot}, cwd=${process.cwd()})`);
	}

	const g = simpleGit(brainRoot);

	// Capture the head before pull to detect new commits
	let beforeHash = '';
	try {
		const log = await g.log({ maxCount: 1 });
		beforeHash = log.latest?.hash ?? '';
	} catch {
		// new/empty repo — ignore
	}

	await pullRebase(brainRoot);

	let afterHash = '';
	try {
		const log = await g.log({ maxCount: 1 });
		afterHash = log.latest?.hash ?? '';
	} catch {
		afterHash = beforeHash;
	}

	const pulled = afterHash !== beforeHash;

	// Migration pass: fill missing created/last_used from git log date
	let migrated = 0;
	try {
		const notes = readThoughts(config.brainRoot);
		const hasUndated = notes.some(n => !n.created || !n.lastUsed);
		if (hasUndated) {
			const fallback =
				(await fileLastCommitDate(brainRoot, 'thoughts.md')) ??
				new Date().toISOString().slice(0, 10);
			migrated = migrateNotePool(notes, fallback);
			if (migrated > 0) writeThoughts(config.brainRoot, notes);
		}
	} catch {
		// migration is best-effort — never block a sync
	}

	// Push any uncommitted local changes (including migration writes)
	let pushed = false;
	try {
		const status = await g.status();
		if (!status.isClean()) {
			const msg = migrated > 0
				? `pb: sync + migrate ${migrated} note(s)`
				: 'pb: sync';
			await commitAndPush(brainRoot, msg);
			pushed = true;
		} else {
			// Push in case local commits exist that haven't been pushed
			await g.push();
			pushed = true;
		}
	} catch {
		// push is best-effort
	}

	const parts: string[] = [];
	if (pulled) parts.push('pulled new commits');
	if (!pulled) parts.push('already up to date');
	if (pushed) parts.push('pushed');
	if (migrated > 0) parts.push(`migrated ${migrated} note(s)`);

	const indexedRepo = await updateGlobalRepoCatalog(config);
	if (indexedRepo) parts.push('updated global repo catalog');

	return {
		pulled,
		pushed,
		migrated,
		indexedRepo,
		message: `Brain repo sync: ${parts.join(', ')}.`,
	};
}
