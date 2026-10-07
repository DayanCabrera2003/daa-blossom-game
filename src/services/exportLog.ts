import type { PlaytestLog } from './playtestLog';
import { summarize } from './playtestSummary';

/** A file ready to hand to the player: its name, its media type and its text. */
export interface ExportedFile {
  readonly filename: string;
  readonly type: string;
  readonly text: string;
}

/**
 * The playtest log as a JSON file the player can send: the summary per level first (what the
 * playtest reads), then every raw entry, so nothing is lost if the summary misses a question.
 * `now` (milliseconds) dates the file and names it, sortable and safe on every file system.
 */
export function exportLog(log: PlaytestLog, now: number): ExportedFile {
  const exportedAt = new Date(now).toISOString();
  const stamp = exportedAt.slice(0, 19).replaceAll(':', '-');
  return {
    filename: `florecer-playtest-${stamp}.json`,
    type: 'application/json',
    text: JSON.stringify({ exportedAt, summary: summarize(log), log }, null, 2),
  };
}
