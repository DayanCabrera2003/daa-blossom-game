import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { ForestLabel } from '@core/search/forest';
import { itemAt } from '@core/shared/itemAt';
import type { DiagramGarden } from './diagramGarden';

/**
 * A garden of the Codex where the reader places pieces on sprouts (plan 07, phase 5): scarecrows
 * (C5) or stones (C12). A touch on a sprout places its piece or takes it back; a button may set
 * them exactly where a finished search says, showing that search's marks until the next touch.
 * Every piece is placed or taken by the rules (`applyAction`).
 */

/** The pieces a reader places: scarecrows that guard, or stones lifted out of the garden. */
export type PlacedPiece = 'scarecrow' | 'stone';

/** The moves that place and take back each piece. */
const MOVES = {
  scarecrow: { place: 'placeScarecrow', take: 'removeScarecrow' },
  stone: { place: 'liftStone', take: 'dropStone' },
} as const;

/** A garden where pieces are being placed. */
export interface PlacingSession {
  readonly piece: PlacedPiece;
  /** The garden after each step: the start first, the garden now last. */
  readonly history: readonly GardenState[];
  /** The marks of the search the pieces were set from, or null once the reader touches. */
  readonly marks: readonly ForestLabel[] | null;
}

/** A new day on `garden`, with no piece placed and only `piece` to place. */
export const startPlacing = (garden: DiagramGarden, piece: PlacedPiece): PlacingSession => ({
  piece,
  history: [
    {
      ...garden.start,
      scarecrows: [],
      stones: [],
      allowed: new Set([MOVES[piece].place, MOVES[piece].take]),
    },
  ],
  marks: null,
});

/** The garden as it is now. */
export const placingNow = (session: PlacingSession): GardenState =>
  itemAt(session.history, session.history.length - 1);

/** The sprouts that hold a piece now. */
export const placedNow = (session: PlacingSession): readonly VertexId[] => {
  const now = placingNow(session);
  return session.piece === 'scarecrow' ? now.scarecrows : now.stones;
};

/** The move that places `vertex`'s piece (`place`) or takes it back. */
const move = (piece: PlacedPiece, place: boolean, vertex: VertexId): Action =>
  ({ type: MOVES[piece][place ? 'place' : 'take'], vertex }) as Action;

/** The garden after `moves`, played by the rules; a refused move is skipped. */
function played(state: GardenState, moves: readonly Action[]): GardenState {
  return moves.reduce((current, next) => {
    const outcome = applyAction(current, next);
    return outcome.ok ? outcome.state : current;
  }, state);
}

/** A touch on `vertex`: its piece placed or taken back, and the search's marks wiped. */
export function touchPlacing(session: PlacingSession, vertex: VertexId): PlacingSession {
  const placed = placedNow(session).includes(vertex);
  const next = played(placingNow(session), [move(session.piece, !placed, vertex)]);
  return { ...session, history: [...session.history, next], marks: null };
}

/** The pieces set on exactly `target`, the others taken back, in one step, showing `marks`. */
export function placeExactly(
  session: PlacingSession,
  target: readonly VertexId[],
  marks: readonly ForestLabel[],
): PlacingSession {
  const placed = placedNow(session);
  const moves = [
    ...placed.filter((v) => !target.includes(v)).map((v) => move(session.piece, false, v)),
    ...target.filter((v) => !placed.includes(v)).map((v) => move(session.piece, true, v)),
  ];
  return {
    ...session,
    history: [...session.history, played(placingNow(session), moves)],
    marks,
  };
}

/** Takes back the last step (nothing before the first). */
export const undoPlacing = (session: PlacingSession): PlacingSession => ({
  ...session,
  history: session.history.length > 1 ? session.history.slice(0, -1) : session.history,
  marks: null,
});

/** Starts the day again, with no piece placed. */
export const resetPlacing = (session: PlacingSession): PlacingSession => ({
  ...session,
  history: session.history.slice(0, 1),
  marks: null,
});
