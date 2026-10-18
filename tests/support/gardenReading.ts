import type { Graph } from '@core/graph/types';
import {
  checkLayout,
  labelsOnVines,
  vineCrossings,
  type LayoutProblem,
} from '../../src/levels/layoutChecks';
import { sideKind, type LayoutShape, type Spot } from '../../src/levels/sandbox/layout';
import { LETTERS } from '../../src/levels/sandbox/names';

// How a garden laid out by the free mode reads, with the checks of the catalog's levels and the
// names the free mode gives its sprouts (A, B, C… in sprout order).

/**
 * The garden of `graph` with its sprouts at `spots`, named as the free mode names them, its bees
 * and flowers on the sides `shape` gives them.
 */
function placed(graph: Graph, spots: readonly Spot[], shape?: LayoutShape) {
  const name = (v: number): string => LETTERS[v] ?? `?${v}`;
  const kind = (v: number) => {
    const side = shape?.kind === 'sides' ? shape.side[v] : undefined;
    return side === undefined ? {} : { kind: sideKind(side) };
  };
  return {
    sprouts: spots.map(({ x, y }, v) => ({ label: name(v), x, y, ...kind(v) })),
    vines: graph.edges.map(([u, v]) => [name(u), name(v)] as const),
  };
}

/**
 * Every name drawn over a sprout, another name, a lantern or a vine, as the catalog's checks find
 * them.
 */
export const readingProblems = (
  graph: Graph,
  spots: readonly Spot[],
  shape?: LayoutShape,
): LayoutProblem[] => {
  const garden = placed(graph, spots, shape);
  return [...checkLayout(garden), ...labelsOnVines(garden)];
};

/** How many pairs of vines cross. */
export const crossingCount = (graph: Graph, spots: readonly Spot[]): number =>
  vineCrossings(placed(graph, spots)).length;
