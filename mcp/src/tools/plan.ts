/**
 * plan tools — manage todos in @plan below the separator line.
 *
 * plan_add      — append a new todo below the separator
 * plan_next     — return the most impactful next todo (first below separator)
 * plan_complete — remove a todo by text match (marks it done and deletes from file)
 */

import { PatbConfig } from '../config.js';
import { readPlan, writePlan } from '../lib/storage.js';
import { syncAndPush } from '../lib/git.js';

// ---------------------------------------------------------------------------
// plan_add
// ---------------------------------------------------------------------------

export interface PlanAddArgs {
  todo: string;
}

export interface PlanAddResult {
  message: string;
}

export async function planAdd(config: PatbConfig, args: PlanAddArgs): Promise<PlanAddResult> {
  const plan = readPlan(config.sourceRoot);
  const todo = args.todo.startsWith('- [ ]') ? args.todo : `- [ ] ${args.todo}`;
  plan.below = plan.below ? `${plan.below}\n${todo}` : todo;
  writePlan(config.sourceRoot, plan);
  await syncAndPush(config.sourceRoot, `pb: plan add - ${args.todo.slice(0, 60)}`);
  return { message: `Added todo: ${todo}` };
}

// ---------------------------------------------------------------------------
// plan_next
// ---------------------------------------------------------------------------

export interface PlanNextResult {
  todo: string | null;
  position: number;
  message: string;
}

export async function planNext(config: PatbConfig): Promise<PlanNextResult> {
  const plan = readPlan(config.sourceRoot);
  const lines = plan.below.split('\n').filter(l => l.trim());
  const todoLines = lines.filter(l => l.match(/^-\s*\[\s*\]/));

  if (todoLines.length === 0) {
    return {
      todo: null,
      position: 0,
      message: 'No pending todos below the separator.',
    };
  }

  const next = todoLines[0]!;
  return {
    todo: next,
    position: 1,
    message: `Next todo (${todoLines.length} remaining): ${next}`,
  };
}

// ---------------------------------------------------------------------------
// plan_complete
// ---------------------------------------------------------------------------

export interface PlanCompleteArgs {
  /** Partial or full text of the todo to mark complete. First match is removed. */
  todo: string;
}

export interface PlanCompleteResult {
  removed: boolean;
  matched: string;
  message: string;
}

export async function planComplete(config: PatbConfig, args: PlanCompleteArgs): Promise<PlanCompleteResult> {
  const plan = readPlan(config.sourceRoot);
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

  const matched = lines[idx]!;
  lines.splice(idx, 1);
  plan.below = lines.join('\n').trim();

  writePlan(config.sourceRoot, plan);
  await syncAndPush(config.sourceRoot, `pb: plan complete - ${args.todo.slice(0, 60)}`);

  return {
    removed: true,
    matched,
    message: `Removed todo: ${matched}`,
  };
}
