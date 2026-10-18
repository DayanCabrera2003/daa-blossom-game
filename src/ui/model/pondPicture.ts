import type { VertexId } from '@core/graph/types';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import { UNMATCHED, type Matching } from '@core/matching/types';
import { err, ok, type Result } from '@core/shared/result';
import type { DiagramGarden } from './diagramGarden';
import type { MiniLayout, MiniMoment } from './miniGarden';
import { groupOf, NO_OVERLAY, STRAND_GAP, strandOf, type GroupTone, type Overlay } from './overlay';

/**
 * The pond of C3 (plan 07, phase 5; level 2.1): your lanterns and the reflection's, the two laid
 * over each other, and the tangle of the vines lit on one side only parted into its threads and
 * loops, each with how many lanterns each side holds on it. The pieces are the core's
 * (`decomposeSymmetricDifference`, the proof of Berge's lemma), never recomputed here.
 */

/** The views of the pond, in the order of its buttons. */
export const POND_VIEWS = ['yours', 'mirror', 'together', 'pieces'] as const;

/** A view of the pond. */
export type PondView = (typeof POND_VIEWS)[number];

/** A thread or loop of the tangle, and the lanterns each side holds on it. */
export interface PondPiece {
  readonly kind: 'thread' | 'loop';
  /** In the core's order: a thread from its smaller end, a loop from its smallest sprout. */
  readonly sprouts: readonly VertexId[];
  readonly yours: number;
  readonly mirror: number;
  /** The reflection's lanterns minus yours: what turning the piece over is worth to you. */
  readonly gain: number;
}

/** What the pond draws in one view: the garden's lanterns then, and the marks over them. */
export interface PondPicture {
  readonly moment: MiniMoment;
  readonly overlay: Overlay;
}

/** The reflection of the level a pond is drawn on, or why there is none. */
export function reflectionOf(garden: DiagramGarden): Result<Matching, { code: 'noMirror' }> {
  const mirror = garden.level?.mirror ?? null;
  return mirror === null ? err({ code: 'noMirror' }) : ok(mirror);
}

/** The threads and loops of `yours ⊕ mirror`, with the lanterns of each side on each. */
export function pondPieces(yours: Matching, mirror: Matching): PondPiece[] {
  return decomposeSymmetricDifference(yours, mirror).map((component) => {
    const mine = component.edges.filter(([u, v]) => yours.mate[u] === v).length;
    return {
      kind: component.kind === 'path' ? 'thread' : 'loop',
      sprouts: component.vertices,
      yours: mine,
      mirror: component.edges.length - mine,
      gain: component.gain,
    };
  });
}

/** The tone of a piece: won by the reflection, tied, or won by you. */
const toneOf = (gain: number): GroupTone => (gain > 0 ? 'gain' : gain === 0 ? 'tie' : 'loss');

/** A gain as the picture writes it: `+1`, `0`, `−1` (with the minus sign of the pixel font). */
const signed = (gain: number): string =>
  gain > 0 ? `+${gain}` : gain === 0 ? '0' : `−${Math.abs(gain)}`;

/** The garden showing `mate`, with nothing placed on it. */
const showing = (mate: readonly (VertexId | -1)[], n: number): MiniMoment => ({
  snapshot: { mate, label: new Array(n).fill('none'), flowers: [] },
  scarecrows: [],
  stones: [],
});

/**
 * The pond in `view`: your lanterns (the garden's own), the reflection's (`mirror`), the
 * reflection's strands laid beside your lanterns, or the tangle parted into its pieces, each wrapped
 * and labelled with its gain, the pairs lit on both sides keeping their lanterns.
 */
export function pondPicture(
  garden: DiagramGarden,
  layout: MiniLayout,
  view: PondView,
  mirror: Matching,
): PondPicture {
  const yours = garden.start.matching;
  const n = yours.mate.length;
  const edges = garden.start.graph.edges;
  const lantern = (matching: Matching) => edges.filter(([u, v]) => matching.mate[u] === v);
  switch (view) {
    case 'yours':
      return { moment: showing(yours.mate, n), overlay: NO_OVERLAY };
    case 'mirror':
      return { moment: showing(mirror.mate, n), overlay: NO_OVERLAY };
    case 'together':
      return {
        moment: showing(yours.mate, n),
        overlay: {
          ...NO_OVERLAY,
          strands: lantern(mirror).map((edge) => strandOf(layout.at, edge, 'mirror', STRAND_GAP)),
        },
      };
    case 'pieces': {
      const shared = yours.mate.map((partner, v) =>
        mirror.mate[v] === partner ? partner : UNMATCHED,
      );
      const pieces = pondPieces(yours, mirror);
      const inTangle = (matching: Matching, other: Matching) =>
        lantern(matching).filter(([u, v]) => other.mate[u] !== v);
      return {
        moment: showing(shared, n),
        overlay: {
          ...NO_OVERLAY,
          strands: [
            ...inTangle(yours, mirror).map((edge) =>
              strandOf(layout.at, edge, 'yours', -STRAND_GAP / 2),
            ),
            ...inTangle(mirror, yours).map((edge) =>
              strandOf(layout.at, edge, 'mirror', STRAND_GAP / 2),
            ),
          ],
          groups: pieces.map((piece) =>
            groupOf(layout.at, piece.sprouts, edges, toneOf(piece.gain), signed(piece.gain)),
          ),
        },
      };
    }
  }
}
