import type { Edge, VertexId } from '@core/graph/types';
import type { RecipeCardId } from '@core/recipe/recipe';
import type { Action } from '@core/rules/actions';
import type { LevelHint } from '@levels/build';

/** What a hint shows: a line (a dialogue id, or a generic interface key), sprouts to glow, a move. */
export interface HintContent {
  readonly line: string;
  /** True when `line` is a generic interface key (`hint.generic.k`), not a dialogue line id. */
  readonly generic: boolean;
  readonly highlight: readonly VertexId[];
  /** Only at grade 3: the step the mentor takes for the player. */
  readonly move: Action | null;
  /** Only at grade 3, under a question: the option the mentor points at (its value). */
  readonly option: number | null;
  /** Only at grade 3, in the mirror challenge: the better reflection the mentor draws. */
  readonly mirror: readonly Edge[] | null;
  /** Only at grade 3, in the flower challenge: the chain the mentor draws in the open garden. */
  readonly chain: readonly VertexId[] | null;
  /** Only at grade 3, when pointing at a vine: the vine that glows, left for the player to touch. */
  readonly vine: Edge | null;
  /** Only at grade 3, in the recipe: the right card the mentor places on it. */
  readonly card: RecipeCardId | null;
}

/** A better reflection the mentor can offer in the mirror challenge, and the chain it leaves. */
export interface MentorReflection {
  readonly lanterns: readonly Edge[];
  readonly chain: readonly VertexId[];
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
 * What the mentor can offer besides the level's own hints, each where it applies: the step for the
 * garden as it is now (play), the right option (a question), a better reflection (the mirror
 * challenge), a chain of the open garden (the flower challenge), the vine to point at, the right
 * card to place in the recipe. Whatever is left out is not offered.
 */
export interface MentorHelp {
  readonly step?: Action | null;
  readonly option?: number | null;
  readonly reflection?: MentorReflection | null;
  readonly chain?: readonly VertexId[] | null;
  readonly vine?: Edge | null;
  readonly card?: RecipeCardId | null;
}

/**
 * The content of hint grade `grade` (GDD §5.3: a nudge, a direction, the mentor's first step).
 * The k-th hint written in the level is grade k; when a level has fewer, the generic line of that
 * grade is used, and from grade 2 on the sprouts of the mentor's `step` glow instead. Under a
 * question there is no step to take: grade 3 points at `option` instead, when it is given. In the
 * mirror challenge, a `reflection` the mentor offers: from grade 2 its chain glows, and grade 3
 * draws it; in the flower challenge the same goes for a `chain`. When the player points at a vine,
 * grade 3 makes the `vine` glow and leaves the touch to them; in the recipe, grade 3 places the
 * `card`.
 */
export function hintContent(
  hints: readonly LevelHint[],
  grade: number,
  help: MentorHelp = {},
): HintContent {
  const mentorStep = help.step ?? null;
  const option = help.option ?? null;
  const reflection = help.reflection ?? null;
  const chain = help.chain ?? null;
  const written = hints[grade - 1];
  const traced = reflection?.chain ?? chain;
  const shown =
    mentorStep !== null
      ? sproutsOf(mentorStep)
      : traced !== null
        ? [...traced].sort((a, b) => a - b)
        : [];
  const highlight =
    written !== undefined && written.highlight.length > 0
      ? written.highlight
      : grade >= 2
        ? shown
        : [];
  return {
    line: written?.line ?? `hint.generic.${grade}`,
    generic: written === undefined,
    highlight,
    move: grade >= 3 ? mentorStep : null,
    option: grade >= 3 ? option : null,
    mirror: grade >= 3 && reflection !== null ? reflection.lanterns : null,
    chain: grade >= 3 ? chain : null,
    vine: grade >= 3 ? (help.vine ?? null) : null,
    card: grade >= 3 ? (help.card ?? null) : null,
  };
}
