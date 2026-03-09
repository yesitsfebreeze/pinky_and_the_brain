/**
 * remember tool — validate, rate, and store a note in thoughts.md.
 *
 * Input:
 *   title    — short title for the note
 *   body     — the note body
 *   rating   — 0–1000 usefulness score (caller supplies; AI determines)
 *   concepts — optional comma-separated concept tags
 *   sources  — optional comma-separated source file paths
 *
 * Behaviour:
 *   - Clamps rating to [0, 1000]
 *   - Rejects if below MIN_RATING (unless force=true)
 *   - If pool at MAX_NOTES: merge/replace lowest or similar note
 *   - Inserts note (today's created + last_used), re-sorts pool
 *   - Commits & pushes brain repo
 */

import { PatbConfig } from '../config.js';
import { Note, today } from '../lib/note.js';
import { readThoughts, writeThoughts } from '../lib/storage.js';
import { syncAndPush } from '../lib/git.js';

export interface RememberArgs {
  title: string;
  body: string;
  rating: number;
  concepts?: string;
  sources?: string;
  relatedNotes?: string;
  /** If true, store even if below MIN_RATING */
  force?: boolean;
}

export interface RememberResult {
  stored: boolean;
  message: string;
  note?: Note;
}

function splitCsv(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s.split(',').map(t => t.trim()).filter(Boolean);
}

function similarity(a: string, b: string): number {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na === nb) return 1;
  // Simple bigram similarity
  const bigrams = (str: string) => {
    const set = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) set.add(str.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.size === 0 || bb.size === 0) return 0;
  let common = 0;
  for (const b of ba) if (bb.has(b)) common++;
  return (2 * common) / (ba.size + bb.size);
}

export async function remember(config: PatbConfig, args: RememberArgs): Promise<RememberResult> {
  const rating = Math.max(0, Math.min(1000, Math.round(args.rating)));

  if (rating < config.minRating && !args.force) {
    return {
      stored: false,
      message: `Rating ${rating} is below MIN_RATING (${config.minRating}). Not stored. Pass force=true to override.`,
    };
  }

  const pool = readThoughts(config.brainRoot);
  const newNote: Note = {
    title: args.title,
    rating,
    created: today(),
    lastUsed: today(),
    concepts: splitCsv(args.concepts),
    relatedNotes: splitCsv(args.relatedNotes),
    sources: splitCsv(args.sources),
    body: args.body,
  };

  // Check for a similar note (title similarity ≥ 0.6)
  const similarIdx = pool.findIndex(n => similarity(n.title, args.title) >= 0.6);
  if (similarIdx !== -1) {
    const existing = pool[similarIdx]!;
    if (existing.rating <= rating) {
      // Replace: merge body, keep higher rating
      pool[similarIdx] = {
        ...newNote,
        rating: Math.max(rating, existing.rating),
        created: existing.created ?? today(),
      };
      writeThoughts(config.brainRoot, pool);
      await syncAndPush(config.brainRoot, `pb: remember - ${args.title}`);
      return { stored: true, message: `Merged with existing note "${existing.title}".`, note: pool[similarIdx] };
    }
    // Existing is higher-rated — update body in place but keep rating
    pool[similarIdx] = { ...existing, body: args.body, lastUsed: today() };
    writeThoughts(config.brainRoot, pool);
    await syncAndPush(config.brainRoot, `pb: remember - ${args.title}`);
    return {
      stored: true,
      message: `Updated body of existing note "${existing.title}" (rating kept at ${existing.rating}).`,
      note: pool[similarIdx],
    };
  }

  if (pool.length >= config.maxNotes) {
    // Pool full — drop lowest if new note outranks it
    const sorted = [...pool].sort((a, b) => a.rating - b.rating);
    const lowest = sorted[0]!;
    if (rating <= lowest.rating) {
      return {
        stored: false,
        message: `Pool is full (${config.maxNotes} notes). New rating ${rating} does not outrank the lowest (${lowest.rating}). Not stored.`,
      };
    }
    const dropIdx = pool.findIndex(n => n === lowest);
    pool.splice(dropIdx, 1);
  }

  pool.push(newNote);
  writeThoughts(config.brainRoot, pool);
  await syncAndPush(config.brainRoot, `pb: remember - ${args.title}`);
  return { stored: true, message: `Stored note "${args.title}" (rating ${rating}).`, note: newNote };
}
