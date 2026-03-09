/**
 * sync tool — pull --rebase the brain repo, then push; report what changed.
 *
 * Input: (none)
 */

import { PatbConfig } from '../config.js';
import { pullRebase, commitAndPush, fileLastCommitDate } from '../lib/git.js';
import { readThoughts, writeThoughts } from '../lib/storage.js';
import { migrateNotePool } from '../lib/note.js';
import simpleGit from 'simple-git';

export interface SyncResult {
  pulled: boolean;
  pushed: boolean;
  migrated: number;
  message: string;
}

export async function sync(config: PatbConfig): Promise<SyncResult> {
  const g = simpleGit(config.brainRoot);

  // Capture the head before pull to detect new commits
  let beforeHash = '';
  try {
    const log = await g.log({ maxCount: 1 });
    beforeHash = log.latest?.hash ?? '';
  } catch {
    // new/empty repo — ignore
  }

  await pullRebase(config.brainRoot);

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
        (await fileLastCommitDate(config.brainRoot, 'thoughts.md')) ??
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
      await commitAndPush(config.brainRoot, msg);
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

  return {
    pulled,
    pushed,
    migrated,
    message: `Brain repo sync: ${parts.join(', ')}.`,
  };
}
