/**
 * MCP resources for p&b — expose memory files as readable resources.
 *
 *   patb://thoughts  — full note pool (thoughts.md)
 *   patb://tree      — file impact map (tree.md)
 *   patb://changes   — changelog (changes.md)
 *   patb://plan      — @plan contents
 */

import { PatbConfig } from './config.js';
import { readThoughts, readTree, readChanges, readPlan } from './lib/storage.js';
import { serializeNotePool } from './lib/note.js';

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export async function getThoughtsResource(config: PatbConfig): Promise<ResourceContent> {
  const notes = readThoughts(config.brainRoot);
  return {
    uri: 'patb://thoughts',
    mimeType: 'text/markdown',
    text: serializeNotePool(notes),
  };
}

export async function getTreeResource(config: PatbConfig): Promise<ResourceContent> {
  return {
    uri: 'patb://tree',
    mimeType: 'text/markdown',
    text: readTree(config.brainRoot) || '# Tree\n\n(empty)',
  };
}

export async function getChangesResource(config: PatbConfig): Promise<ResourceContent> {
  return {
    uri: 'patb://changes',
    mimeType: 'text/markdown',
    text: readChanges(config.brainRoot) || '# Changes\n\n(empty)',
  };
}

export async function getPlanResource(config: PatbConfig): Promise<ResourceContent> {
  const plan = readPlan(config.sourceRoot);
  const SEPARATOR = '█████████████████████';
  const text = [
    plan.above,
    SEPARATOR,
    plan.below,
  ].filter(Boolean).join('\n\n') + '\n';
  return {
    uri: 'patb://plan',
    mimeType: 'text/markdown',
    text,
  };
}
