import type { VertexId } from '@core/graph/types';
import { isExposed } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import { itemAt } from '@core/shared/itemAt';
import { SPROUT_AREA } from '@levels/fields';
import type { Point } from '../input/target';
import { degreeIn, pondPieces, sharedPairs, type Piece, type Side } from '../systems/pond';
import type { TextRef } from './hud';
import { driftApart, type Box } from './pondLayout';

/**
 * The picture of a tangle (plan 03, phases 7 and 8): your lanterns against a reflection's, as the
 * strands each side lights alone, the pairs both light, the sprouts of each piece and where each
 * piece drifts once the tangle separates. Pure. The pond of 2.1–2.3 and the mirror challenge of
 * 2.4 both draw it, each choosing the reflection and the moment.
 */

/** A vine of the reflection's picture: a strand of one side, or a pair both sides light (faded). */
export interface PondStrand {
  readonly a: Point;
  readonly b: Point;
  readonly side: Side | 'shared';
  /** The index of its piece in `offsets`; null for a shared pair, which belongs to none. */
  readonly piece: number | null;
}

/** A sprout of the tangle, drawn again over the garden so it can drift with its piece. */
export interface PondSprout {
  readonly at: Point;
  readonly label: string;
  /** Whether it holds one of your lanterns. */
  readonly lit: boolean;
  readonly piece: number;
}

/** Everything drawn of the reflection at one moment. */
export interface PondPicture {
  readonly strands: readonly PondStrand[];
  readonly sprouts: readonly PondSprout[];
  /** How far each piece has drifted: none until the tangle separates. */
  readonly offsets: readonly Point[];
  readonly separated: boolean;
  /** You light as many lanterns as the reflection: it has nothing more to show, and fades away. */
  readonly dissolved: boolean;
  /** The strands of the sprout touched to explore, shown over it (and its piece, if any). */
  readonly degree: {
    readonly at: Point;
    readonly piece: number | null;
    readonly text: TextRef;
  } | null;
  /** The piece pointed at as the winning thread (the mirror challenge's check), or null. */
  readonly winning: number | null;
}

/** How a tangle is shown: drifted apart or not, and the sprout touched to explore it, if any. */
export interface TangleView {
  readonly separated: boolean;
  readonly touched: VertexId | null;
}

/** The box around the sprouts of a piece. */
function boxOf(piece: Piece, at: (v: VertexId) => Point): Box {
  const points = piece.sprouts.map(at);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * The picture of the tangle `yours ⊕ mirror` over the garden, with its pieces (in the core's order)
 * drifted apart when `view.separated`, and the strands of the touched sprout shown over it. Nothing
 * is pointed at as winning and the reflection is not dissolved: whoever draws the picture decides.
 */
export function tanglePicture(
  yours: Matching,
  mirror: Matching,
  positions: readonly Point[],
  labels: readonly string[],
  view: TangleView,
): PondPicture {
  const at = (v: VertexId): Point => itemAt(positions, v);
  const pieces = pondPieces(yours, mirror);

  const strands: PondStrand[] = pieces.flatMap((piece, index) =>
    piece.strands.map((strand) => ({
      a: at(strand.u),
      b: at(strand.v),
      side: strand.side,
      piece: index,
    })),
  );
  for (const [u, v] of sharedPairs(yours, mirror)) {
    strands.push({ a: at(u), b: at(v), side: 'shared', piece: null });
  }
  const sprouts = pieces.flatMap((piece, index) =>
    piece.sprouts.map((v) => ({
      at: at(v),
      label: labels[v] ?? String(v),
      lit: !isExposed(yours, v),
      piece: index,
    })),
  );

  const { separated, touched } = view;
  const offsets = separated
    ? driftApart(
        pieces.map((piece) => boxOf(piece, at)),
        SPROUT_AREA,
      )
    : pieces.map(() => ({ x: 0, y: 0 }));

  const home = touched === null ? -1 : pieces.findIndex((piece) => piece.sprouts.includes(touched));
  const degree =
    touched === null
      ? null
      : {
          at: at(touched),
          piece: home === -1 ? null : home,
          text: { key: 'pond.strands', params: { count: degreeIn(yours, mirror, touched) } },
        };

  return { strands, sprouts, offsets, separated, dissolved: false, degree, winning: null };
}
