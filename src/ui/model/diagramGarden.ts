import { decodeGarden, type GardenCodeError } from '@core/codes/gardenCode';
import { createGardenState, type GardenState } from '@core/rules/state';
import { err, ok, type Result } from '@core/shared/result';
import type { Level } from '@levels/build';
import type { CardDemo } from '@levels/cards/demo';
import type { CardId } from '@levels/cards/schema';
import type { SproutKind } from '@levels/fields';
import type { DiagramSpec } from './diagramSpec';

/**
 * The garden a diagram of the Codex starts from (plan 07, phase 4): a level as it starts, the
 * tiny garden of a mechanic card as its demo starts, or a garden code. The garden itself is the
 * core's (`createGardenState`, the level's start, the card's first frame); this module only finds
 * it and says where each sprout sits, in the garden's own coordinates, for `miniGarden` to fit.
 */

/** A point, in whatever coordinates the caller works in. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A garden ready for a diagram. */
export interface DiagramGarden {
  /** The name of each sprout, by id. */
  readonly names: readonly string[];
  /** Where each sprout sits, by id: the level's or card's own places, or a ring for a code. */
  readonly positions: readonly Point[];
  /** Bee or flower in a garden of both (chapter 3), null otherwise. */
  readonly kinds: readonly (SproutKind | null)[];
  /** The garden as it starts, with the actions its source allows. */
  readonly start: GardenState;
  /** The level it comes from, when it is one (for its solution); null otherwise. */
  readonly level: Level | null;
}

/** Where the levels and cards are found; the book hands over the real catalog. */
export interface DiagramSources {
  level(id: string): Level | undefined;
  card(id: CardId): CardDemo | undefined;
}

/** Why a diagram has no garden. */
export type DiagramGardenError =
  | { readonly code: 'noGarden' }
  | { readonly code: 'noLevel'; readonly level: string }
  | { readonly code: 'noCard'; readonly card: CardId }
  | { readonly code: 'badCode'; readonly error: GardenCodeError };

/** How far from the middle the sprouts of a garden code sit; `miniGarden` scales it to its box. */
const RING_RADIUS = 60;

/** The name of sprout `id` of a garden code: A … Z, then A1 … Z1, and so on. */
const nameOf = (id: number): string => {
  const letter = String.fromCharCode(65 + (id % 26));
  const round = Math.floor(id / 26);
  return round === 0 ? letter : `${letter}${round}`;
};

/** Sprouts `0..n-1` round a ring, the first at the top, going clockwise. */
const ringOf = (n: number): Point[] =>
  Array.from({ length: n }, (_, id) => {
    const angle = (2 * Math.PI * id) / n;
    return { x: RING_RADIUS * Math.sin(angle), y: -RING_RADIUS * Math.cos(angle) };
  });

/** The garden a diagram block names, from `sources`. */
export function diagramGarden(
  spec: Pick<DiagramSpec, 'level' | 'card' | 'code'>,
  sources: DiagramSources,
): Result<DiagramGarden, DiagramGardenError> {
  if (spec.level !== undefined) {
    const level = sources.level(spec.level);
    if (level === undefined) return err({ code: 'noLevel', level: spec.level });
    return ok({
      names: level.data.sprouts.map((sprout) => sprout.label),
      positions: level.data.sprouts.map(({ x, y }) => ({ x, y })),
      kinds: level.data.sprouts.map((sprout) => sprout.kind ?? null),
      start: level.start,
      level,
    });
  }
  if (spec.card !== undefined) {
    const demo = sources.card(spec.card);
    const first = demo?.frames[0];
    if (demo === undefined || first === undefined) return err({ code: 'noCard', card: spec.card });
    return ok({
      names: demo.names,
      positions: demo.positions,
      kinds: demo.names.map(() => null),
      start: first.state,
      level: null,
    });
  }
  if (spec.code !== undefined) {
    const decoded = decodeGarden(spec.code);
    if (!decoded.ok) return err({ code: 'badCode', error: decoded.error });
    const { graph, matching } = decoded.value;
    const names = Array.from({ length: graph.n }, (_, id) => nameOf(id));
    return ok({
      names,
      positions: ringOf(graph.n),
      kinds: names.map(() => null),
      start: createGardenState({ graph, matching, allowed: [] }),
      level: null,
    });
  }
  return err({ code: 'noGarden' });
}
