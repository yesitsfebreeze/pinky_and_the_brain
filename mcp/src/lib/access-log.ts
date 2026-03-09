/**
 * Best-effort access logging for MCP activity.
 *
 * Appends one line per event to ~/.patb/access.log.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PATB_DIR = path.join(os.homedir(), '.patb');
const ACCESS_LOG_PATH = path.join(PATB_DIR, 'access.log');

function sanitize(value: unknown): string {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

export function logAccess(event: string, fields: Record<string, unknown> = {}): void {
  try {
    fs.mkdirSync(PATB_DIR, { recursive: true });

    const parts: string[] = [
      `ts=${new Date().toISOString()}`,
      `event=${sanitize(event)}`,
    ];

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue;
      parts.push(`${sanitize(key)}=${sanitize(value)}`);
    }

    fs.appendFileSync(ACCESS_LOG_PATH, `${parts.join(' ')}\n`, 'utf8');
  } catch {
    // Logging is best-effort; never fail the MCP server because of logging.
  }
}

export function accessLogPath(): string {
  return ACCESS_LOG_PATH;
}
