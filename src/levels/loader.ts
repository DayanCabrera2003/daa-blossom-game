import { err, type Result } from '@core/shared/result';
import { buildLevel, type BuildError, type Level } from './build';
import { levelSchema } from './schema';

/** Why a level file could not be loaded: its shape, or the garden it describes. */
export type LoadError =
  { readonly code: 'schema'; readonly issues: readonly string[] } | BuildError;

/**
 * Loads a level from parsed JSON: validates its shape with the schema, then builds the garden.
 * Schema problems come back as readable lines, `path: message`, for `check-levels` and for
 * whoever edits a level by hand.
 */
export function loadLevel(json: unknown): Result<Level, LoadError> {
  const parsed = levelSchema.safeParse(json);
  if (!parsed.success) {
    return err({
      code: 'schema',
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join('.') || '(level)'}: ${issue.message}`,
      ),
    });
  }
  return buildLevel(parsed.data);
}
