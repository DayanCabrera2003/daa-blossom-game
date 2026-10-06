import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';

/** A hint written for a level, with sprout ids. */
export interface LevelHint {
  readonly line: string;
  readonly highlight: readonly VertexId[];
}

/** What a hint shows: a line (a dialogue id, or a generic interface key), sprouts to glow, a move. */
export interface HintContent {
  readonly line: string;
  /** True when `line` is a generic interface key (`hint.generic.k`), not a dialogue line id. */
  readonly generic: boolean;
  readonly highlight: readonly VertexId[];
  /** Only at grade 3: the step the mentor takes for the player. */
  readonly move: Action | null;
}

/** The sprouts an action involves, each once, in ascending order. */
export function sproutsOf(action: Action): VertexId[] {
  const found = new Set<VertexId>();
  // Every numeric field of an action names a sprout, except a flower's id.
  for (const [key, value] of Object.entries(action)) {
    if (key === 'blossom') continue;
    if (typeof value === 'number') found.add(value);
    if (Array.isArray(value)) for (const v of value as VertexId[]) found.add(v);
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * The content of hint grade `grade` (GDD §5.3: a nudge, a direction, the mentor's first step).
 * The k-th hint written in the level is grade k; when a level has fewer, the generic line of that
 * grade is used, and from grade 2 on the sprouts of the mentor's step glow instead.
 */
export function hintContent(
  hints: readonly LevelHint[],
  grade: number,
  mentorStep: Action | null,
): HintContent {
  const written = hints[grade - 1];
  const highlight =
    written !== undefined && written.highlight.length > 0
      ? written.highlight
      : grade >= 2 && mentorStep !== null
        ? sproutsOf(mentorStep)
        : [];
  return {
    line: written?.line ?? `hint.generic.${grade}`,
    generic: written === undefined,
    highlight,
    move: grade >= 3 ? mentorStep : null,
  };
}
