// The check of the audio fallbacks behind `npm run assets:check` (plan 09, phase 8). An encoder
// does not give the same bytes in every version, so a fallback is not compared byte for byte:
// it must exist, have been made from the original the manifest ships now (its sha256), weigh what
// its table says (what the budget counts) and last as long as its original.
import type { Fallbacks } from '../../src/game/assets/fallbackSchema';
import type { Manifest } from '../../src/game/assets/manifestSchema';
import { fallbackJobs } from './transcode';

/** How far a fallback's length may stray from its original's: the encoder's priming and padding. */
export const DURATION_SLACK_MS = 50;

/** What the check reads from the disk, paths relative to the repository root. */
export interface FallbackFacts {
  /** The length of an original Ogg file. */
  originalMs(path: string): number;
  /** The size and length of a fallback, or null when there is no such file. */
  fallback(path: string): { readonly bytes: number; readonly durationMs: number } | null;
}

/** One readable line per problem with the fallbacks of `manifest`; empty when they agree. */
export function checkFallbacks(
  manifest: Manifest,
  table: Fallbacks,
  facts: FallbackFacts,
): string[] {
  const problems: string[] = [];
  const jobs = fallbackJobs(manifest);
  for (const job of jobs) {
    const listed = table.files[job.key];
    if (listed === undefined) {
      problems.push(`${job.key} has no fallback: run npm run assets:fallbacks`);
      continue;
    }
    if (listed.from !== job.from) {
      problems.push(
        `${job.key}: its fallback was made from another version of it: run npm run assets:fallbacks`,
      );
      continue;
    }
    const found = facts.fallback(job.output);
    if (found === null) {
      problems.push(`${job.output} is missing: run npm run assets:fallbacks`);
      continue;
    }
    if (found.bytes !== listed.bytes) {
      problems.push(`${job.output} has ${found.bytes} bytes, the table says ${listed.bytes}`);
    }
    const original = facts.originalMs(job.input);
    if (Math.abs(found.durationMs - original) > DURATION_SLACK_MS) {
      problems.push(
        `${job.output} lasts ${Math.round(found.durationMs)} ms, its original ${Math.round(original)} ms`,
      );
    }
  }
  const made = new Set(jobs.map((job) => job.key));
  for (const key of Object.keys(table.files)) {
    if (!made.has(key))
      problems.push(`${key} has a fallback but is not an Ogg sound of the manifest`);
  }
  return problems;
}
