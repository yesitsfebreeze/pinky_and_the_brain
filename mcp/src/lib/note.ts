/**
 * Note type, parse, and serialize for the p&b note pool (thoughts.md).
 *
 * Note format:
 *   #### {title}
 *   <!-- rating: {0–1000} | created: {YYYY-MM-DD} | last_used: {YYYY-MM-DD} | concepts: {tag1}, {tag2} | related-notes: {title1}, {title2} -->
 *   <!-- sources: {file1}, {file2} -->
 *   {body text}
 */

export interface Note {
  title: string;
  rating: number;
  created: string | null;
  lastUsed: string | null;
  concepts: string[];
  relatedNotes: string[];
  sources: string[];
  body: string;
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a single note block (everything from the `#### ` heading to end of block).
 * Returns null if the block is malformed.
 */
export function parseNote(block: string): Note | null {
  const lines = block.split('\n');
  let i = 0;

  // Title line
  const titleLine = lines[i++]?.trim() ?? '';
  if (!titleLine.startsWith('#### ')) return null;
  const title = titleLine.slice(5).trim();

  // Metadata comment
  const metaLine = lines[i++]?.trim() ?? '';
  if (!metaLine.startsWith('<!-- ') || !metaLine.endsWith(' -->')) return null;

  const meta = parseMeta(metaLine.slice(5, -4));
  let rating = parseInt(meta['rating'] ?? '0', 10);
  if (isNaN(rating)) rating = 0;

  // Back-compat: ratings ≤ 100 are from the pre-0–1000 era → multiply by 10
  if (rating > 0 && rating <= 100) rating = rating * 10;

  const created = meta['created']?.trim() || null;
  const lastUsed = meta['last_used']?.trim() || null;
  const concepts = splitCsv(meta['concepts'] ?? '');
  const relatedNotes = splitCsv(meta['related-notes'] ?? '');

  // Optional sources comment
  let sources: string[] = [];
  if (lines[i]?.trim().startsWith('<!-- sources:')) {
    const srcLine = lines[i++]!.trim();
    const inner = srcLine.slice(5, -4).trim(); // strip '<!-- ' and ' -->'
    sources = splitCsv(inner.replace(/^sources:\s*/, ''));
  }

  // Body: everything remaining, trimmed
  const body = lines.slice(i).join('\n').trim();

  return { title, rating, created, lastUsed, concepts, relatedNotes, sources, body };
}

/**
 * Parse the entire thoughts.md content into a sorted note array.
 * Skips the `# Thoughts` header and any blank separators.
 */
export function parseNotePool(content: string): Note[] {
  // Split on lines that begin with '#### ' — each starts a new note block
  const blocks = content.split(/(?=^#### )/m).filter(b => b.trim().startsWith('#### '));
  const notes: Note[] = [];
  for (const block of blocks) {
    const note = parseNote(block.trim());
    if (note) notes.push(note);
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serializeNote(note: Note): string {
  const parts: string[] = [];

  parts.push(`#### ${note.title}`);

  // Metadata comment — always include rating; omit optional fields if empty
  const metaParts: string[] = [`rating: ${note.rating}`];
  if (note.created) metaParts.push(`created: ${note.created}`);
  if (note.lastUsed) metaParts.push(`last_used: ${note.lastUsed}`);
  if (note.concepts.length > 0) metaParts.push(`concepts: ${note.concepts.join(', ')}`);
  if (note.relatedNotes.length > 0) metaParts.push(`related-notes: ${note.relatedNotes.join(', ')}`);
  parts.push(`<!-- ${metaParts.join(' | ')} -->`);

  // Sources comment (omit if empty)
  if (note.sources.length > 0) {
    parts.push(`<!-- sources: ${note.sources.join(', ')} -->`);
  }

  if (note.body) parts.push(note.body);

  return parts.join('\n');
}

/**
 * Serialize the full note pool back to thoughts.md content.
 * Notes are sorted by rating descending.
 */
export function serializeNotePool(notes: Note[]): string {
  const sorted = [...notes].sort((a, b) => b.rating - a.rating);
  const blocks = sorted.map(serializeNote);
  return `# Thoughts\n\n${blocks.join('\n\n')}\n`;
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Fill missing `created` and `lastUsed` fields with `fallbackDate` for every
 * note that lacks them.  Returns the number of notes that were updated.
 *
 * This is a pure in-place mutation — the same array is returned so callers
 * don't have to rebind the reference.
 */
export function migrateNotePool(notes: Note[], fallbackDate: string): number {
  let migrated = 0;
  for (const note of notes) {
    if (!note.created || !note.lastUsed) {
      if (!note.created) note.created = fallbackDate;
      if (!note.lastUsed) note.lastUsed = fallbackDate;
      migrated++;
    }
  }
  return migrated;
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMeta(inner: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Split on ' | ' but only at top level (not inside values)
  const parts = inner.split(/\s*\|\s*/);
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

function splitCsv(value: string): string[] {
  if (!value.trim()) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
