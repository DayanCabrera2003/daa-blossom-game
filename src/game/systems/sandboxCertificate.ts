import { stonesFromForest } from '@core/certificates/fromForest';
import { oddComponents } from '@core/certificates/oddComponents';
import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { checkVertexCover, koenigCover } from '@core/certificates/vertexCover';
import { bipartition } from '@core/graph/bipartition';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action, ActionType } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import { plantForest } from '@core/search/forest';
import { searchStatus } from '@core/search/searchStatus';
import { invariant } from '@core/shared/invariant';
import { appendDay } from './appendDay';
import { lentDay } from './lentDay';
import { garden, takesMoves, type LevelSession } from './levelSession';
import type { PlayedDay } from './playedDay';

/**
 * The certificate of a garden of the free mode, on demand (GDD §5.7; plan 08, phase 13): the proof
 * that no more lanterns fit, read off the last search, once it has ended without a chain. The
 * stones go on its moons (`stonesFromForest`, the Council of 7.4); in a garden of bees and flowers
 * the scarecrows go where König puts them (`koenigCover`, 3.8). Both are placed as moves of the day
 * with the tools lent for it, then "Terminé", so the sun walks them too and the Council's count of
 * the top bar reads them. The core proves they always close; they are checked again here all the
 * same, since a certificate that did not would teach a falsehood.
 */

/** The certificates the player knows: the stones after 7.4, the scarecrows after 3.8. */
export interface CertificateKinds {
  readonly stones: boolean;
  readonly scarecrows: boolean;
}

/** The Council's count of the stones placed: stones, odd groups, and sprouts left in the dark. */
export interface StoneCount {
  readonly stones: number;
  readonly groups: number;
  readonly dark: number;
}

/**
 * Why no certificate is placed: no search has ended without a chain on the garden shown
 * (`notYet`), or the only certificate known is the scarecrows' and the garden has an odd loop
 * (`notBees`).
 */
export type CertificateRefusal = 'notYet' | 'notBees';

/** What asking for the certificate did. */
export type Certified =
  | { readonly kind: 'refused'; readonly reason: CertificateRefusal }
  | {
      readonly kind: 'certified';
      readonly session: LevelSession;
      /** The garden shown, then one garden per stone or scarecrow moved, then "Terminé". */
      readonly day: PlayedDay;
      /** The count of the stones, when they were placed. */
      readonly stones: StoneCount | null;
      /** How many scarecrows guard the garden, when they were placed. */
      readonly scarecrows: number | null;
    };

/** The moves lent for placing a certificate. */
const CERTIFICATE_MOVES: readonly ActionType[] = [
  'liftStone',
  'dropStone',
  'placeScarecrow',
  'removeScarecrow',
  'declareDone',
];

/**
 * The moves that take the sprouts holding something (`now`) to exactly `wanted`: off those that
 * should not, onto those that should.
 */
function settle(
  now: readonly VertexId[],
  wanted: readonly VertexId[],
  off: (vertex: VertexId) => Action,
  on: (vertex: VertexId) => Action,
): Action[] {
  return [
    ...now.filter((vertex) => !wanted.includes(vertex)).map(off),
    ...wanted.filter((vertex) => !now.includes(vertex)).map(on),
  ];
}

/**
 * The certificate of the garden shown, with what the player knows, as moves: the stones on the
 * moons and, among bees and flowers, König's scarecrows, then "Terminé" unless it is already said
 * of that very garden. The search counts as ended when nothing is left to explore from any sprout
 * in the dark, folding allowed: in a garden where every sprout is lit, at once.
 */
function certificateOf(
  state: GardenState,
  kinds: CertificateKinds,
):
  | { readonly kind: 'refused'; readonly reason: CertificateRefusal }
  | {
      readonly kind: 'ready';
      readonly moves: readonly Action[];
      readonly stones: readonly VertexId[] | null;
      readonly scarecrows: readonly VertexId[] | null;
    } {
  invariant(kinds.stones || kinds.scarecrows, 'a certificate is asked by who knows one');
  const { graph, layer, matching } = state;
  const bees = bipartition(graph).kind === 'bipartite';
  if (!kinds.stones && !bees) return { kind: 'refused', reason: 'notBees' };
  const status = searchStatus(layer, state.search, { roots: null, foldAllowed: true });
  if (status !== 'exhausted') return { kind: 'refused', reason: 'notYet' };
  const forest = state.search ?? plantForest(layer.matching, []);
  const stones = kinds.stones ? stonesFromForest(layer, forest) : null;
  // Bees and flowers fold no loop, so the forest is on the sprouts themselves.
  const scarecrows = kinds.scarecrows && bees ? koenigCover(graph, forest) : null;
  invariant(
    stones === null || checkTutteBerge(graph, matching, stones).ok,
    'the moons of a search ended without a chain close the Council count',
  );
  invariant(
    scarecrows === null ||
      (checkVertexCover(graph, scarecrows).ok && scarecrows.length === size(matching)),
    "König's scarecrows guard every vine, as many as the lanterns",
  );
  const placed = [
    ...(stones === null
      ? []
      : settle(
          state.stones,
          stones,
          (vertex) => ({ type: 'dropStone', vertex }),
          (vertex) => ({ type: 'liftStone', vertex }),
        )),
    ...(scarecrows === null
      ? []
      : settle(
          state.scarecrows,
          scarecrows,
          (vertex) => ({ type: 'removeScarecrow', vertex }),
          (vertex) => ({ type: 'placeScarecrow', vertex }),
        )),
  ];
  const said = placed.length === 0 && state.declaredDone;
  const moves: Action[] = said ? placed : [...placed, { type: 'declareDone' }];
  return { kind: 'ready', moves, stones, scarecrows };
}

/**
 * Asks for the certificate of the garden shown in `session`, with the certificates the player
 * knows: refused with its reason, or placed after the garden shown as moves of the day (anything
 * undone is dropped, as with any move), with what it proves. Null while the script holds the
 * garden, when no move is taken either.
 */
export function certifySession(session: LevelSession, kinds: CertificateKinds): Certified | null {
  if (!takesMoves(session)) return null;
  const state = garden(session);
  const found = certificateOf(state, kinds);
  if (found.kind === 'refused') return found;
  const day = lentDay(state, found.moves, CERTIFICATE_MOVES, 'the certificate');
  const { graph } = state;
  const { stones } = found;
  return {
    kind: 'certified',
    session: appendDay(session, day),
    day,
    stones:
      stones === null
        ? null
        : {
            stones: stones.length,
            groups: oddComponents(graph, stones).length,
            dark: graph.n - 2 * size(state.matching),
          },
    scarecrows: found.scarecrows?.length ?? null,
  };
}
