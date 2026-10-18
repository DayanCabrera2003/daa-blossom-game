import { connectedComponents } from '@core/graph/components';
import { tutteBergeBound } from '@core/certificates/tutteBerge';
import { size } from '@core/matching/queries';
import type { Translate } from '@services/i18n';
import type { MiniLayout, MiniMoment } from './miniGarden';
import { groupOf, NO_OVERLAY, type Overlay } from './overlay';
import { placingNow, type PlacingSession } from './placing';

/**
 * What the stones of C12 show (plan 07, phase 5; levels 7.3 and 7.4): the garden with its lifted
 * stones and the groups the rest falls into, the odd ones wrapped in their colour with how many
 * sprouts they hold, and the count under it. Each odd group leaves a sprout in the dark or lit by
 * a stone, and each stone lights at most one: at least odd − stones sprouts sleep in the dark, so
 * no garden lights more than the bound (`tutteBergeBound`). When the lanterns reach it, the stones
 * prove there is no room for one more (Tutte–Berge, in the garden's words).
 */

/** What the count under the garden says. */
export interface StonesCount {
  readonly odd: number;
  readonly stones: number;
  /** How many sprouts sleep in the dark at least: odd − stones, or none. */
  readonly least: number;
  readonly dark: number;
  readonly lanterns: number;
  readonly bound: number;
}

/** The garden of a stones session, its groups and its count. */
export interface StonesPicture {
  readonly moment: MiniMoment;
  readonly overlay: Overlay;
  readonly count: StonesCount;
}

/** The picture of `session`, its sprouts placed by `layout`. */
export function stonesPicture(layout: MiniLayout, session: PlacingSession): StonesPicture {
  const { graph, matching, stones } = placingNow(session);
  const groups = connectedComponents(graph, new Set(stones));
  const odd = groups.filter((group) => group.length % 2 === 1).length;
  const lanterns = size(matching);
  return {
    moment: {
      snapshot: {
        mate: matching.mate,
        label: session.marks ?? matching.mate.map(() => 'none'),
        flowers: [],
      },
      scarecrows: [],
      stones,
    },
    overlay: {
      ...NO_OVERLAY,
      groups: groups.map((group) =>
        group.length % 2 === 1
          ? groupOf(layout.at, group, graph.edges, 'odd', String(group.length))
          : groupOf(layout.at, group, graph.edges, 'even'),
      ),
    },
    count: {
      odd,
      stones: stones.length,
      least: Math.max(0, odd - stones.length),
      dark: graph.n - 2 * lanterns,
      lanterns,
      bound: tutteBergeBound(graph, stones),
    },
  };
}

/** What the count says, the bound it proves and, when the lanterns reach it, that it is tight. */
export function stonesWords(count: StonesCount, t: Translate): string[] {
  const { odd, stones, least, dark, lanterns, bound } = count;
  return [
    t('diagram.stones.count', { odd, stones, least, dark }),
    lanterns === bound
      ? t('diagram.stones.tight', { lanterns })
      : t('diagram.stones.bound', { bound }),
  ];
}
