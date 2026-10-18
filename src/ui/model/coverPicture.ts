import { checkVertexCover } from '@core/certificates/vertexCover';
import { size } from '@core/matching/queries';
import type { Translate } from '@services/i18n';
import { placingNow, type PlacingSession } from './placing';
import type { MiniLayout, MiniMoment } from './miniGarden';
import { NO_OVERLAY, STRAND_GAP, strandOf, type Overlay } from './overlay';

/**
 * What the scarecrows of C5 show (plan 07, phase 5): the garden with its scarecrows, a strand
 * beside every vine one of them guards, the marks of the search when the scarecrows were set on
 * its moons, and the count under it: vines guarded, scarecrows, lanterns. When every vine is
 * guarded (`checkVertexCover`), no garden can light more lanterns than there are scarecrows; with
 * as many of each, the lanterns are the most there can be (König, in the garden's words).
 */

/** What the count under the garden says. */
export interface CoverCount {
  readonly guarded: number;
  readonly vines: number;
  readonly scarecrows: number;
  readonly lanterns: number;
  /** Whether every vine is guarded. */
  readonly covers: boolean;
}

/** The garden of a cover session, its marks and its count. */
export interface CoverPicture {
  readonly moment: MiniMoment;
  readonly overlay: Overlay;
  readonly count: CoverCount;
}

/** The picture of `session`, its sprouts placed by `layout`. */
export function coverPicture(layout: MiniLayout, session: PlacingSession): CoverPicture {
  const now = placingNow(session);
  const { graph, matching, scarecrows } = now;
  const guarded = graph.edges.filter(([u, v]) => scarecrows.includes(u) || scarecrows.includes(v));
  return {
    moment: {
      snapshot: {
        mate: matching.mate,
        label: session.marks ?? matching.mate.map(() => 'none'),
        flowers: [],
      },
      scarecrows,
      stones: [],
    },
    overlay: {
      ...NO_OVERLAY,
      strands: guarded.map((edge) => strandOf(layout.at, edge, 'guarded', STRAND_GAP)),
    },
    count: {
      guarded: guarded.length,
      vines: graph.edges.length,
      scarecrows: scarecrows.length,
      lanterns: size(matching),
      covers: checkVertexCover(graph, scarecrows).ok,
    },
  };
}

/** What the count says, and what a garden all guarded proves. */
export function coverWords(count: CoverCount, t: Translate): string[] {
  const { guarded, vines, scarecrows, lanterns } = count;
  const lines = [t('diagram.cover.count', { guarded, vines, scarecrows, lanterns })];
  if (count.covers) {
    lines.push(
      count.scarecrows === count.lanterns
        ? t('diagram.cover.tight')
        : t('diagram.cover.all', { scarecrows }),
    );
  }
  return lines;
}
