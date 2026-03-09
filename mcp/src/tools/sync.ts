/**
 * sync tool — pull --rebase the brain repo, then push; report what changed.
 *
 * Input: (none)
 */

import { PatbConfig } from '../config.js';
import { pullRebase, commitAndPush } from '../lib/git.js';
import simpleGit from 'simple-git';

export interface SyncResult {
  pulled: boolean;
  pushed: boolean;
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

  // Push any uncommitted local changes
  let pushed = false;
  try {
    const status = await g.status();
    if (!status.isClean()) {
      await commitAndPush(config.brainRoot, 'pb: sync');
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

  return {
    pulled,
    pushed,
    message: `Brain repo sync: ${parts.join(', ')}.`,
  };
}
