import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import type { CutSession } from './cutPlay';
import type { DiagramGarden } from './diagramGarden';
import type { MiniLayout, MiniMoment } from './miniGarden';
import { NO_OVERLAY, ringOf, strandOf, type Overlay } from './overlay';

/**
 * The two gardens of the cut at the flower of C8 (plan 07, phase 5), side by side: the open garden
 * with the chain being drawn and, once cut, its stretch up to the first petal, its two ends and the
 * base; and the same garden with the flower folded, the same stretch reaching the folded flower.
 */

/** One of the two gardens: what it wears, and the marks over it. */
export interface CutSide {
  readonly moment: MiniMoment;
  readonly overlay: Overlay;
}

/** The open garden and the folded one. */
export interface CutPicture {
  readonly open: CutSide;
  readonly folded: CutSide;
}

/** The vines of a path, in order. */
const vinesOf = (path: readonly VertexId[]): [VertexId, VertexId][] =>
  path.slice(1).map((v, i) => [itemAt(path, i), v]);

/** The picture of `session` on `garden`, whose flower (base first) is `flower`. */
export function cutPicture(
  garden: DiagramGarden,
  layout: MiniLayout,
  flower: readonly VertexId[],
  session: CutSession,
): CutPicture {
  const { mate } = garden.start.matching;
  const label = mate.map(() => 'none' as const);
  const base = itemAt(flower, 0);
  const openMoment: MiniMoment = {
    snapshot: { mate, label, flowers: [] },
    scarecrows: [],
    stones: [],
  };
  const foldedMoment: MiniMoment = {
    ...openMoment,
    snapshot: {
      mate,
      label,
      flowers: [{ id: 0, base, members: [...flower].sort((a, b) => a - b), parent: null }],
    },
  };
  const cut = session.result?.kind === 'cut' ? session.result.cut : null;
  if (cut === null) {
    return {
      open: {
        moment: openMoment,
        overlay: { ...NO_OVERLAY, rings: [ringOf(layout.at, base, 'base')] },
      },
      folded: { moment: foldedMoment, overlay: NO_OVERLAY },
    };
  }
  const stretch = vinesOf(cut.stretch).map((vine) => strandOf(layout.at, vine, 'stretch'));
  const start = itemAt(cut.chain, 0);
  const end = itemAt(cut.chain, cut.chain.length - 1);
  return {
    open: {
      moment: openMoment,
      overlay: {
        ...NO_OVERLAY,
        strands: stretch,
        rings: [
          ringOf(layout.at, start, 'end'),
          ringOf(layout.at, end, 'end'),
          ringOf(layout.at, base, 'base'),
          ...(cut.petal === null ? [] : [ringOf(layout.at, cut.petal, 'petal')]),
        ],
      },
    },
    folded: {
      moment: foldedMoment,
      overlay: { ...NO_OVERLAY, strands: stretch, rings: [ringOf(layout.at, start, 'end')] },
    },
  };
}
