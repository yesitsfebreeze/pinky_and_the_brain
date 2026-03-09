"use strict";
/**
 * sync tool — pull --rebase the brain repo, then push; report what changed.
 *
 * Input: (none)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = sync;
const git_js_1 = require("../lib/git.js");
const simple_git_1 = __importDefault(require("simple-git"));
async function sync(config) {
    const g = (0, simple_git_1.default)(config.brainRoot);
    // Capture the head before pull to detect new commits
    let beforeHash = '';
    try {
        const log = await g.log({ maxCount: 1 });
        beforeHash = log.latest?.hash ?? '';
    }
    catch {
        // new/empty repo — ignore
    }
    await (0, git_js_1.pullRebase)(config.brainRoot);
    let afterHash = '';
    try {
        const log = await g.log({ maxCount: 1 });
        afterHash = log.latest?.hash ?? '';
    }
    catch {
        afterHash = beforeHash;
    }
    const pulled = afterHash !== beforeHash;
    // Push any uncommitted local changes
    let pushed = false;
    try {
        const status = await g.status();
        if (!status.isClean()) {
            await (0, git_js_1.commitAndPush)(config.brainRoot, 'pb: sync');
            pushed = true;
        }
        else {
            // Push in case local commits exist that haven't been pushed
            await g.push();
            pushed = true;
        }
    }
    catch {
        // push is best-effort
    }
    const parts = [];
    if (pulled)
        parts.push('pulled new commits');
    if (!pulled)
        parts.push('already up to date');
    if (pushed)
        parts.push('pushed');
    return {
        pulled,
        pushed,
        message: `Brain repo sync: ${parts.join(', ')}.`,
    };
}
