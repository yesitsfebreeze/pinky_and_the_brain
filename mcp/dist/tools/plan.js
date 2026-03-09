"use strict";
/**
 * plan tools — manage todos in @plan below the separator line.
 *
 * plan_add      — append a new todo below the separator
 * plan_next     — return the most impactful next todo (first below separator)
 * plan_complete — remove a todo by text match (marks it done and deletes from file)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planAdd = planAdd;
exports.planNext = planNext;
exports.planComplete = planComplete;
const storage_js_1 = require("../lib/storage.js");
const git_js_1 = require("../lib/git.js");
async function planAdd(config, args) {
    const plan = (0, storage_js_1.readPlan)(config.sourceRoot);
    const todo = args.todo.startsWith('- [ ]') ? args.todo : `- [ ] ${args.todo}`;
    plan.below = plan.below ? `${plan.below}\n${todo}` : todo;
    (0, storage_js_1.writePlan)(config.sourceRoot, plan);
    await (0, git_js_1.syncAndPush)(config.sourceRoot, `pb: plan add - ${args.todo.slice(0, 60)}`);
    return { message: `Added todo: ${todo}` };
}
async function planNext(config) {
    const plan = (0, storage_js_1.readPlan)(config.sourceRoot);
    const lines = plan.below.split('\n').filter(l => l.trim());
    const todoLines = lines.filter(l => l.match(/^-\s*\[\s*\]/));
    if (todoLines.length === 0) {
        return {
            todo: null,
            position: 0,
            message: 'No pending todos below the separator.',
        };
    }
    const next = todoLines[0];
    return {
        todo: next,
        position: 1,
        message: `Next todo (${todoLines.length} remaining): ${next}`,
    };
}
async function planComplete(config, args) {
    const plan = (0, storage_js_1.readPlan)(config.sourceRoot);
    const lines = plan.below.split('\n');
    const queryLower = args.todo.toLowerCase();
    const idx = lines.findIndex(l => l.toLowerCase().includes(queryLower));
    if (idx === -1) {
        return {
            removed: false,
            matched: '',
            message: `No todo matched "${args.todo}".`,
        };
    }
    const matched = lines[idx];
    lines.splice(idx, 1);
    plan.below = lines.join('\n').trim();
    (0, storage_js_1.writePlan)(config.sourceRoot, plan);
    await (0, git_js_1.syncAndPush)(config.sourceRoot, `pb: plan complete - ${args.todo.slice(0, 60)}`);
    return {
        removed: true,
        matched,
        message: `Removed todo: ${matched}`,
    };
}
