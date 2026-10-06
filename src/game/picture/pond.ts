import { isExposed, size } from '@core/matching/queries';
import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import { SPROUT_AREA } from '@levels/fields';
import type { Point } from '../input/target';
import { isPast } from '../systems/flow';
import { garden, type LevelSession } from '../systems/levelSession';
import { degreeIn, pondPieces, sharedPairs, type Piece, type Side } from '../systems/pond';
import type { TextRef } from './hud';
import { driftApart, type Box } from './pondLayout';

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
}

/** The box around the sprouts of a piece. */
function boxOf(piece: Piece, at: (v: VertexId) => Point): Box {
  const points = piece.sprouts.map(at);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * The picture of the reflection over the garden (plan 03, phase 7), or null while there is none to
 * show: in a level without one, or before its `mirror` step. It follows your lanterns as they are
 * now, so while playing (2.3) the tangle changes with every move. The pieces drift apart once a
 * `separate` step is behind; the sprout touched to explore shows its strands.
 */
export function pondPicture(
  session: LevelSession,
  positions: readonly Point[],
  labels: readonly string[],
): PondPicture | null {
  const { mirror } = session.level;
  const { flow } = session;
  if (mirror === null || !isPast(flow, 'mirror')) return null;
  const yours = garden(session).matching;
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

  const separated = isPast(flow, 'separate');
  const offsets = separated
    ? driftApart(
        pieces.map((piece) => boxOf(piece, at)),
        SPROUT_AREA,
      )
    : pieces.map(() => ({ x: 0, y: 0 }));

  const { touched } = flow;
  const home = touched === null ? -1 : pieces.findIndex((piece) => piece.sprouts.includes(touched));
  const degree =
    touched === null
      ? null
      : {
          at: at(touched),
          piece: home === -1 ? null : home,
          text: { key: 'pond.strands', params: { count: degreeIn(yours, mirror, touched) } },
        };

  return {
    strands,
    sprouts,
    offsets,
    separated,
    dissolved: size(yours) >= size(mirror),
    degree,
  };
}
