/**
 * Atomic read/write helpers for all p&b memory files:
 *   thoughts.md, tree.md, changes.md, @plan
 *
 * Writes are atomic: write to a sibling .tmp file, then rename.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { Note, parseNotePool, serializeNotePool } from './note.js';

// ---------------------------------------------------------------------------
// Atomic write primitive
// ---------------------------------------------------------------------------

function writeAtomic(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

// ---------------------------------------------------------------------------
// thoughts.md
// ---------------------------------------------------------------------------

export function readThoughts(brainRoot: string): Note[] {
  const content = readFile(path.join(brainRoot, 'thoughts.md'));
  return content ? parseNotePool(content) : [];
}

export function writeThoughts(brainRoot: string, notes: Note[]): void {
  writeAtomic(path.join(brainRoot, 'thoughts.md'), serializeNotePool(notes));
}

// ---------------------------------------------------------------------------
// tree.md  (raw markdown table, not parsed into a structured type)
// ---------------------------------------------------------------------------

/**
 * Sort tree.md table rows by the Impact column (col 4, 1-based) descending.
 * Table format: | File | Access Rate (1–10) | Line Count | Impact (1–10) | Notes |
 */
function sortTreeByImpact(content: string): string {
  const lines = content.split('\n');
  const tableStart = lines.findIndex(l => l.trim().startsWith('|'));
  if (tableStart === -1) return content;

  const headerLine = lines[tableStart];
  const sepLine = lines[tableStart + 1];

  const dataRows: string[] = [];
  let afterTable = tableStart + 2;
  while (afterTable < lines.length && lines[afterTable]!.trim().startsWith('|')) {
    dataRows.push(lines[afterTable]!);
    afterTable++;
  }

  const getImpact = (row: string): number => {
    // split by '|': [0]='' [1]=File [2]=AccessRate [3]=LineCount [4]=Impact [5]=Notes
    const cols = row.split('|').map(c => c.trim());
    const val = parseInt(cols[4] ?? '0', 10);
    return isNaN(val) ? 0 : val;
  };

  dataRows.sort((a, b) => getImpact(b) - getImpact(a));

  return [
    ...lines.slice(0, tableStart),
    headerLine,
    sepLine,
    ...dataRows,
    ...lines.slice(afterTable),
  ].join('\n');
}

export function readTree(brainRoot: string): string {
  return readFile(path.join(brainRoot, 'tree.md'));
}

export function writeTree(brainRoot: string, content: string): void {
  writeAtomic(path.join(brainRoot, 'tree.md'), sortTreeByImpact(content));
}

// ---------------------------------------------------------------------------
// changes.md  (raw markdown, cap 20 entries enforced on write)
// ---------------------------------------------------------------------------

/** Max entries kept in changes.md */
const MAX_CHANGES = 20;

export function readChanges(brainRoot: string): string {
  return readFile(path.join(brainRoot, 'changes.md'));
}

/**
 * Prepend a new entry and keep at most MAX_CHANGES entries.
 * Entry format: `#### YYYY-MM-DD — {title}\n{body}`
 */
export function prependChange(brainRoot: string, title: string, body: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const existing = readChanges(brainRoot);
  const newEntry = `#### ${date} — ${title}\n${body}`;

  // Split existing content into entries on '#### ' boundaries (skip header)
  const entries = existing
    .split(/(?=^#### )/m)
    .filter(b => b.trim().startsWith('#### '));

  const capped = [newEntry, ...entries].slice(0, MAX_CHANGES);
  const header = existing.match(/^#[^#].*\n/) ? existing.match(/^#[^#].*\n/)![0] : '# Changes\n';
  writeAtomic(path.join(brainRoot, 'changes.md'), `${header}\n${capped.join('\n\n')}\n`);
}

export function writeChanges(brainRoot: string, content: string): void {
  writeAtomic(path.join(brainRoot, 'changes.md'), content);
}

// ---------------------------------------------------------------------------
// @plan
// ---------------------------------------------------------------------------

const PLAN_SEPARATOR = '█████████████████████';

export interface PlanContent {
  /** Raw text above the thick separator (freeform ideas) */
  above: string;
  /** AI-generated todos below the thick separator */
  below: string;
}

export function readPlan(sourceRoot: string): PlanContent {
  const content = readFile(path.join(sourceRoot, '@plan'));
  const sepIdx = content.indexOf(PLAN_SEPARATOR);
  if (sepIdx === -1) {
    return { above: content.trim(), below: '' };
  }
  const above = content.slice(0, sepIdx).trim();
  const below = content.slice(sepIdx + PLAN_SEPARATOR.length).trim();
  return { above, below };
}

export function writePlan(sourceRoot: string, plan: PlanContent): void {
  const parts: string[] = [];
  if (plan.above) parts.push(plan.above);
  parts.push(PLAN_SEPARATOR);
  if (plan.below) parts.push(plan.below);
  writeAtomic(path.join(sourceRoot, '@plan'), parts.join('\n\n') + '\n');
}

// ---------------------------------------------------------------------------
// sync.md
// ---------------------------------------------------------------------------

export interface SyncState {
  sourceBranch: string;
  sourceHead: string;
  indexedAt: string;
}

export function readSync(brainRoot: string): SyncState | null {
  const content = readFile(path.join(brainRoot, 'sync.md'));
  if (!content) return null;
  const get = (key: string): string =>
    content.match(new RegExp(`^${key}:\\s*(.+)`, 'm'))?.[1]?.trim() ?? '';
  return {
    sourceBranch: get('SOURCE_BRANCH'),
    sourceHead: get('SOURCE_HEAD'),
    indexedAt: get('INDEXED_AT'),
  };
}

export function writeSync(brainRoot: string, state: SyncState): void {
  const content = [
    `SOURCE_BRANCH: ${state.sourceBranch}`,
    `SOURCE_HEAD: ${state.sourceHead}`,
    `INDEXED_AT: ${state.indexedAt}`,
  ].join('\n') + '\n';
  writeAtomic(path.join(brainRoot, 'sync.md'), content);
}

// ---------------------------------------------------------------------------
// @pinky helpers
// ---------------------------------------------------------------------------

const HOME = os.homedir();

export interface PinkyContent {
  brainRepoUrl: string;
  linkedRepos: string[];
  status: string | null;
}

export function readPinky(sourceRoot: string): PinkyContent {
  const content = readFile(path.join(sourceRoot, '@pinky'));
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

  // First URL line is the brain repo
  const brainRepoUrl = lines[0] ?? '';

  // Remaining lines: URL lines are linked repos; STATUS: {mode} is the status
  let status: string | null = null;
  const linkedRepos: string[] = [];
  for (const line of lines.slice(1)) {
    const statusMatch = line.match(/^STATUS:\s*(.+)$/i);
    if (statusMatch) {
      status = statusMatch[1].trim();
    } else if (line.startsWith('http') || line.startsWith('git@')) {
      linkedRepos.push(line);
    }
  }
  return { brainRepoUrl, linkedRepos, status };
}

export function writePinky(sourceRoot: string, pinky: PinkyContent): void {
  const lines: string[] = [pinky.brainRepoUrl];
  if (pinky.status) lines.push(`STATUS: ${pinky.status}`);
  lines.push(...pinky.linkedRepos);
  writeAtomic(path.join(sourceRoot, '@pinky'), lines.join('\n') + '\n');
}
