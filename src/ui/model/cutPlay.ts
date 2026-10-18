import { cutAtFlower, type FlowerCut } from '@core/blossom/cutAtFlower';
import { expandPath } from '@core/blossom/expand';
import { searchWithFlowers } from '@core/edmonds/search';
import type { VertexId } from '@core/graph/types';
import { checkAugmentingPath, type PathError } from '@core/matching/paths';
import { isExposed } from '@core/matching/queries';
import { err, ok, type Result } from '@core/shared/result';
import type { DiagramGarden } from './diagramGarden';

/**
 * The cut at the flower of C8 (plan 07, phase 5; level 4.11): the reader draws a chain in the open
 * garden, sprout by sprout, and once it ends in the dark the core checks it
 * (`checkAugmentingPath`) and cuts it at the flower (`cutAtFlower`): the stretch from its outside
 * end up to the first petal, which in the folded garden is a chain to the flower. Nothing is lit;
 * the garden stays as it was, as in the challenge of 4.11.
 */

/** What the drawing is: a chain cut at the flower, or a drawing ending in the dark that is none. */
export type CutResult =
  | { readonly kind: 'cut'; readonly cut: FlowerCut }
  | { readonly kind: 'notAChain'; readonly error: PathError };

/** A drawing on the open garden. */
export interface CutSession {
  /** The sprouts touched, in order. */
  readonly drawn: readonly VertexId[];
  /** What the drawing is, once it ends in the dark; null while it is being drawn. */
  readonly result: CutResult | null;
}

/** The flower of the level a cut is drawn on (base first), or why there is none. */
export function flowerOf(garden: DiagramGarden): Result<VertexId[], { code: 'noFlower' }> {
  const flower = garden.level?.flower ?? null;
  return flower === null ? err({ code: 'noFlower' }) : ok([...flower]);
}

/** Nothing drawn yet. */
export const startCut = (): CutSession => ({ drawn: [], result: null });

/** The drawing cleared. */
export const clearCut = startCut;

/** What `drawn` is: nothing yet until it ends in the dark, then a chain cut, or none. */
function judge(
  garden: DiagramGarden,
  flower: readonly VertexId[],
  drawn: readonly VertexId[],
): CutSession {
  const { graph, matching } = garden.start;
  const end = drawn[drawn.length - 1];
  if (drawn.length < 2 || end === undefined || !isExposed(matching, end)) {
    return { drawn, result: null };
  }
  const checked = checkAugmentingPath(graph, matching, drawn);
  if (!checked.ok) return { drawn, result: { kind: 'notAChain', error: checked.error } };
  return { drawn, result: { kind: 'cut', cut: cutAtFlower(graph, matching, flower, drawn) } };
}

/** A touch on `vertex`: added to the drawing, or taken off when it is the last one touched. */
export function touchCut(
  session: CutSession,
  garden: DiagramGarden,
  flower: readonly VertexId[],
  vertex: VertexId,
): CutSession {
  const drawn =
    session.drawn.at(-1) === vertex ? session.drawn.slice(0, -1) : [...session.drawn, vertex];
  return judge(garden, flower, drawn);
}

/** A chain of the open garden as a search with flowers finds and unfolds it, cut at the flower. */
export function showChain(garden: DiagramGarden, flower: readonly VertexId[]): CutSession {
  const { graph, matching } = garden.start;
  const outcome = searchWithFlowers(graph, matching);
  if (outcome.kind !== 'augmentingPath') return startCut();
  return judge(garden, flower, expandPath(outcome.layer, outcome.path));
}
