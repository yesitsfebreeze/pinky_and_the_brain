/**
 * Git operations for p&b brain and source repos via simple-git.
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';

function withDirContext(message: string, dir: string): string {
  const resolvedDir = path.resolve(dir);
  const cwd = process.cwd();
  return `${message} (repoDir=${resolvedDir}, cwd=${cwd})`;
}

function ensureExistingDir(dir: string): string {
  const resolvedDir = path.resolve(dir);
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(withDirContext('Git repo directory does not exist', resolvedDir));
  }
  if (!fs.statSync(resolvedDir).isDirectory()) {
    throw new Error(withDirContext('Git repo path is not a directory', resolvedDir));
  }
  return resolvedDir;
}

function git(dir: string): SimpleGit {
  const resolvedDir = ensureExistingDir(dir);
  return simpleGit(resolvedDir);
}

/** Pull with rebase. Throws on merge conflict (caller should handle). */
export async function pullRebase(dir: string): Promise<void> {
  const g = git(dir);
  try {
    await g.pull(['--rebase']);
  } catch (err: unknown) {
    // If rebase fails, abort it and rethrow so caller can report
    try {
      await g.rebase(['--abort']);
    } catch {
      // ignore abort failure — repo may not be in a rebase state
    }
    throw err;
  }
}

/**
 * Stage all changes, commit if there is anything staged, then push.
 * Skips commit if working tree is clean.
 */
export async function commitAndPush(dir: string, message: string): Promise<void> {
  const g = git(dir);
  await g.add('-A');
  const status = await g.status();
  if (!status.isClean()) {
    await g.commit(message);
  }
  await g.push();
}

/**
 * Pull --rebase, then commit all changes and push.
 * This is the canonical "sync brain" operation used after every memory write.
 *
 * Set PATB_NO_GIT=1 to skip all git operations (useful in tests / CI).
 */
export async function syncAndPush(dir: string, message: string): Promise<void> {
  if (process.env.PATB_NO_GIT) return;
  await pullRebase(dir);
  await commitAndPush(dir, message);
}

/** Return the current HEAD commit hash for the given repo. */
export async function headHash(dir: string): Promise<string> {
  const g = git(dir);
  const log = await g.log({ maxCount: 1 });
  return log.latest?.hash ?? '';
}

/** Return the default branch name (prefers 'main', falls back to 'master'). */
export async function defaultBranch(dir: string): Promise<string> {
  const g = git(dir);
  try {
    const branches = await g.branch(['-r']);
    if (branches.all.includes('remotes/origin/main')) return 'main';
    if (branches.all.includes('remotes/origin/master')) return 'master';
  } catch {
    // ignore — may be a new/empty repo
  }
  return 'main';
}

/**
 * Return the last commit date (YYYY-MM-DD) for a specific file in the repo.
 * Returns null if the file has no git history or the repo is empty.
 */
export async function fileLastCommitDate(dir: string, file: string): Promise<string | null> {
  const g = git(dir);
  try {
    const log = await g.log({ file, maxCount: 1 });
    const date = log.latest?.date;
    if (!date) return null;
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/** Return commits since `sinceHash` (exclusive) on the current branch. */
export async function commitsSince(
  dir: string,
  sinceHash: string
): Promise<Array<{ hash: string; message: string; date: string }>> {
  const g = git(dir);
  const log = await g.log({ from: sinceHash, to: 'HEAD' });
  return (log.all ?? []).map(c => ({
    hash: c.hash,
    message: c.message,
    date: c.date,
  }));
}
