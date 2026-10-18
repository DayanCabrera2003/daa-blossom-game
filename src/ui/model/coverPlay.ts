import { koenigCover } from '@core/certificates/vertexCover';
import { bipartition } from '@core/graph/bipartition';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { ForestLabel } from '@core/search/forest';
import { bipartiteMatching } from '@core/search/bipartiteMatching';
import { itemAt } from '@core/shared/itemAt';
import type { DiagramGarden } from './diagramGarden';

/**
 * The scarecrows of C5 (plan 07, phase 5; level 3.8): the reader places and takes scarecrows by
 * touching sprouts, or asks for them "on the moons": the search of bees and flowers runs to its
 * end (`bipartiteMatching`) and König's cover is read off its last forest (`koenigCover`), every
 * moon and the sprouts of one side it never reached. Every scarecrow is placed or taken by the
 * rules (`applyAction`); the search's marks are shown with the scarecrows they placed, until the
 * next touch.
 */

/** A garden being guarded. */
export interface CoverSession {
  /** The garden after each touch: the start first, the garden now last. */
  readonly history: readonly GardenState[];
  /** The marks of the search the scarecrows were set from, or null once the reader touches. */
  readonly marks: readonly ForestLabel[] | null;
}

/** The moves a garden to guard allows. */
const COVER_MOVES = new Set(['placeScarecrow', 'removeScarecrow'] as const);

/** A new day on `garden`, with no scarecrow yet. */
export const startCover = (garden: DiagramGarden): CoverSession => ({
  history: [{ ...garden.start, scarecrows: [], allowed: COVER_MOVES }],
  marks: null,
});

/** The garden as it is now. */
export const coverNow = (session: CoverSession): GardenState =>
  itemAt(session.history, session.history.length - 1);

/** The garden after `moves`, played by the rules; a refused move is skipped. */
function played(state: GardenState, moves: readonly Action[]): GardenState {
  return moves.reduce((current, move) => {
    const outcome = applyAction(current, move);
    return outcome.ok ? outcome.state : current;
  }, state);
}

/** The move a touch on `vertex` asks for: a scarecrow placed, or taken off where one stands. */
const touchMove = (state: GardenState, vertex: VertexId): Action =>
  state.scarecrows.includes(vertex)
    ? { type: 'removeScarecrow', vertex }
    : { type: 'placeScarecrow', vertex };

/** A touch on `vertex`: its scarecrow placed or taken off, and the search's marks wiped. */
export function touchCover(session: CoverSession, vertex: VertexId): CoverSession {
  const now = coverNow(session);
  const next = played(now, [touchMove(now, vertex)]);
  return { history: [...session.history, next], marks: null };
}

/**
 * The scarecrows set on the moons of a finished search of bees and flowers (and on the sprouts of
 * the first side it never reached), the others taken off, in one step. A garden that is not of
 * bees and flowers has no such search, and the session stays as it is.
 */
export function onTheMoons(session: CoverSession): CoverSession {
  const now = coverNow(session);
  if (bipartition(now.graph).kind !== 'bipartite') return session;
  const run = bipartiteMatching(now.graph, now.matching);
  if (!run.ok) return session;
  const target = koenigCover(now.graph, run.value.forest);
  const moves: Action[] = [
    ...now.scarecrows
      .filter((v) => !target.includes(v))
      .map((vertex): Action => ({ type: 'removeScarecrow', vertex })),
    ...target
      .filter((v) => !now.scarecrows.includes(v))
      .map((vertex): Action => ({ type: 'placeScarecrow', vertex })),
  ];
  return { history: [...session.history, played(now, moves)], marks: run.value.forest.label };
}

/** Takes back the last step (nothing before the first). */
export const undoCover = (session: CoverSession): CoverSession => ({
  history: session.history.length > 1 ? session.history.slice(0, -1) : session.history,
  marks: null,
});

/** Starts the day again, with no scarecrow. */
export const resetCover = (session: CoverSession): CoverSession => ({
  history: session.history.slice(0, 1),
  marks: null,
});
