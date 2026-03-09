"use strict";
/**
 * Git operations for p&b brain and source repos via simple-git.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullRebase = pullRebase;
exports.commitAndPush = commitAndPush;
exports.syncAndPush = syncAndPush;
exports.headHash = headHash;
exports.defaultBranch = defaultBranch;
exports.commitsSince = commitsSince;
const simple_git_1 = __importDefault(require("simple-git"));
function git(dir) {
    return (0, simple_git_1.default)(dir);
}
/** Pull with rebase. Throws on merge conflict (caller should handle). */
async function pullRebase(dir) {
    const g = git(dir);
    try {
        await g.pull(['--rebase']);
    }
    catch (err) {
        // If rebase fails, abort it and rethrow so caller can report
        try {
            await g.rebase(['--abort']);
        }
        catch {
            // ignore abort failure — repo may not be in a rebase state
        }
        throw err;
    }
}
/**
 * Stage all changes, commit if there is anything staged, then push.
 * Skips commit if working tree is clean.
 */
async function commitAndPush(dir, message) {
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
 */
async function syncAndPush(dir, message) {
    await pullRebase(dir);
    await commitAndPush(dir, message);
}
/** Return the current HEAD commit hash for the given repo. */
async function headHash(dir) {
    const g = git(dir);
    const log = await g.log({ maxCount: 1 });
    return log.latest?.hash ?? '';
}
/** Return the default branch name (prefers 'main', falls back to 'master'). */
async function defaultBranch(dir) {
    const g = git(dir);
    try {
        const branches = await g.branch(['-r']);
        if (branches.all.includes('remotes/origin/main'))
            return 'main';
        if (branches.all.includes('remotes/origin/master'))
            return 'master';
    }
    catch {
        // ignore — may be a new/empty repo
    }
    return 'main';
}
/** Return commits since `sinceHash` (exclusive) on the current branch. */
async function commitsSince(dir, sinceHash) {
    const g = git(dir);
    const log = await g.log({ from: sinceHash, to: 'HEAD' });
    return (log.all ?? []).map(c => ({
        hash: c.hash,
        message: c.message,
        date: c.date,
    }));
}
