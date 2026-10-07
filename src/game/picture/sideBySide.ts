import { contract, openLayer } from '@core/blossom/contract';
import { members } from '@core/blossom/hierarchy';
import { checkBlossom } from '@core/blossom/isBlossom';
import type { VertexId } from '@core/graph/types';
import { isExposed, isMatchedEdge } from '@core/matching/queries';
import { itemAt } from '@core/shared/itemAt';
import { SIDE_BY_SIDE } from '@levels/fields';
import { centroid, flowerOutline } from '../input/flowerShape';
import { FLOWER_PADDING } from '../input/HitTest';
import type { Point } from '../input/target';
import { garden, stepNow, type LevelSession } from '../systems/levelSession';
import type { TextRef } from './hud';

/**
 * The picture of the flower challenge (GDD 4.11, plan 04 phase 3): the open garden stays where the
 * level puts it, in the left half, with its flower outlined, and the same garden folded is drawn in
 * the right half, the flower as one node at the centre of its petals. The last chain drawn shows
 * cut at the flower, one moment of the argument after another. Pure: the view only paints it and
 * keeps the clock.
 */

/** How long each moment of the argument stays before the next one (milliseconds). */
export const MOMENT_MS = 2200;

/** The moment of the argument shown `elapsed` milliseconds after a chain is drawn; the last stays. */
export const momentAt = (elapsed: number): 1 | 2 | 3 =>
  elapsed < MOMENT_MS ? 1 : elapsed < 2 * MOMENT_MS ? 2 : 3;

/** A node of the folded garden as drawn: a sprout, or the folded flower (no name). */
export interface FoldedNodePicture {
  readonly at: Point;
  readonly label: string;
  readonly lit: boolean;
  readonly flower: boolean;
}

/** A vine of the folded garden as drawn. */
export interface FoldedVinePicture {
  readonly a: Point;
  readonly b: Point;
  readonly lit: boolean;
}

/** The last chain drawn, cut at the flower, at one moment of the argument. */
export interface CutPicture {
  readonly moment: 1 | 2 | 3;
  /** What the moment says. */
  readonly caption: TextRef;
  /** The chain in the open garden, from its end outside the flower. */
  readonly chain: readonly Point[];
  /** 1: the end outside the flower, the other end, and the base, the only petal in the dark. */
  readonly outside: Point;
  readonly other: Point;
  readonly base: Point;
  /** 2: the stretch up to the first petal, in the open garden. */
  readonly stretch: readonly Point[];
  /** 3: the same stretch in the folded garden. */
  readonly folded: readonly Point[];
}

/** Everything drawn of the flower challenge at one moment. */
export interface SideBySidePicture {
  /** The flower's outline in the open garden. */
  readonly outline: readonly Point[];
  /** The nodes of the folded garden, by folded id. */
  readonly nodes: readonly FoldedNodePicture[];
  readonly vines: readonly FoldedVinePicture[];
  /** The last chain drawn in the challenge; null before one, or after a refused drawing. */
  readonly cut: CutPicture | null;
}

/** What each moment says; the second depends on whether the chain touches the flower at all. */
function captionOf(moment: 1 | 2 | 3, touches: boolean): TextRef {
  const key =
    moment === 1
      ? 'flower.ends'
      : moment === 2
        ? touches
          ? 'flower.stretch'
          : 'flower.whole'
        : 'flower.folded';
  return { key, params: {} };
}

/**
 * The picture of the open garden and its folded copy, or null when the level declares no flower,
 * or the garden no longer holds it as a flower with its base in the dark (the folded copy would
 * mean nothing). `elapsed` is the time since the last chain was drawn, which picks its moment; the
 * cut shows only during the challenge.
 */
export function sideBySidePicture(
  session: LevelSession,
  positions: readonly Point[],
  labels: readonly string[],
  elapsed: number,
): SideBySidePicture | null {
  const { flower } = session.level;
  if (flower === null) return null;
  const { graph, matching } = garden(session);
  const base = itemAt(flower, 0);
  if (!checkBlossom(graph, matching, flower).ok || !isExposed(matching, base)) return null;

  const folded = contract(openLayer(graph, matching), flower).layer;
  const right = (point: Point): Point => ({ x: point.x + SIDE_BY_SIDE.shift, y: point.y });
  const nodes = folded.nodes.map((node, id): FoldedNodePicture => {
    const petals = members(node).map((v) => itemAt(positions, v));
    const lit = !isExposed(folded.matching, id);
    return node.kind === 'blossom'
      ? { at: right(centroid(petals)), label: '', lit, flower: true }
      : {
          at: right(itemAt(petals, 0)),
          label: labels[node.vertex] ?? String(node.vertex),
          lit,
          flower: false,
        };
  });
  const nodeAt = (id: VertexId): Point => itemAt(nodes, id).at;
  const vines = folded.graph.edges.map(([u, v]) => ({
    a: nodeAt(u),
    b: nodeAt(v),
    lit: isMatchedEdge(folded.matching, u, v),
  }));

  const shown = session.flower.shown;
  const challenged = stepNow(session)?.step === 'flowerChallenge';
  const at = (v: VertexId): Point => itemAt(positions, v);
  let cut: CutPicture | null = null;
  if (challenged && shown?.kind === 'cut') {
    const { argument } = shown;
    const moment = momentAt(elapsed);
    cut = {
      moment,
      caption: captionOf(moment, shown.cut.petal !== null),
      chain: shown.cut.chain.map(at),
      outside: at(argument.ends.outside),
      other: at(argument.ends.other),
      base: at(argument.ends.base),
      stretch: argument.stretch.map(at),
      folded: argument.folded.map(nodeAt),
    };
  }
  return {
    outline: flowerOutline(flower.map(at), FLOWER_PADDING),
    nodes,
    vines,
    cut,
  };
}
