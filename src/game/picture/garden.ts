import { members } from '@core/blossom/hierarchy';
import type { GardenNode } from '@core/blossom/types';
import { oddComponents } from '@core/certificates/oddComponents';
import type { Edge, VertexId } from '@core/graph/types';
import { isExposed, isMatchedEdge } from '@core/matching/queries';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { SproutKind } from '@levels/fields';
import { chainGain } from '../input/dragChain';
import { flowerOutline } from '../input/flowerShape';
import { FLOWER_PADDING } from '../input/HitTest';
import { NO_SELECTION, type Selection } from '../input/selection';
import type { Point } from '../input/target';

/** A sprout as drawn. */
export interface SproutPicture {
  readonly vertex: VertexId;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  /** Bee or flower in a garden of bees and flowers (chapter 3), drawn as different shapes. */
  readonly kind: SproutKind | null;
  readonly lit: boolean;
  readonly mark: 'sun' | 'moon' | null;
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly inChain: boolean;
  readonly scarecrow: boolean;
  readonly stone: boolean;
}

/** A vine as drawn: lit or dark, hidden by fog or not, inside a folded flower or not. */
export interface VinePicture {
  readonly u: VertexId;
  readonly v: VertexId;
  readonly a: Point;
  readonly b: Point;
  readonly lit: boolean;
  readonly visible: boolean;
  readonly inFlower: boolean;
  /** Glowing because of a hint: the vine to point at (4.2). */
  readonly glowing: boolean;
}

/** The outline of a folded flower; depth 0 is a flower on top, deeper ones are nested inside. */
export interface FlowerPicture {
  readonly id: number;
  readonly depth: number;
  readonly outline: readonly Point[];
}

/** Everything drawn in the garden at one moment. */
export interface GardenPicture {
  readonly sprouts: readonly SproutPicture[];
  readonly vines: readonly VinePicture[];
  /** Outermost flowers first, each followed by the flowers inside it. */
  readonly flowers: readonly FlowerPicture[];
  /** With stones lifted, the outline of each odd group they leave (GDD §4.1, key animation 4). */
  readonly oddGroups: readonly (readonly Point[])[];
  readonly fog: { readonly revealed: readonly boolean[] } | null;
  /** The chain being dragged, with what letting go would gain (+1, 0 in grey, or not legal). */
  readonly chain: { readonly points: readonly Point[]; readonly gain: 1 | 0 | null } | null;
}

/** What the player is pointing at, on top of the garden itself. */
export interface PointingExtras {
  readonly selection: Selection;
  readonly highlight: readonly VertexId[];
  readonly chain: readonly VertexId[] | null;
  /** The vine a hint makes glow, if any; screens without such hints leave it out. */
  readonly vineGlow?: Edge | null;
}

/** Nothing selected, glowing or dragged. */
export const NO_EXTRAS: PointingExtras = {
  selection: NO_SELECTION,
  highlight: [],
  chain: null,
  vineGlow: null,
};

/** Margin of nested flower outlines, narrower the deeper they are, and of odd groups. */
const nestedPadding = (depth: number): number => Math.max(4, FLOWER_PADDING - 4 * depth);
const GROUP_PADDING = 8;

/**
 * The outlines of the folded flowers among `nodes` (those on top have depth 0), each followed by
 * the flowers inside it, around their petals drawn at `at`.
 */
export function flowerPictures(
  nodes: readonly GardenNode[],
  at: (v: VertexId) => Point,
): FlowerPicture[] {
  const flowers: FlowerPicture[] = [];
  const walk = (node: GardenNode, depth: number): void => {
    if (node.kind !== 'blossom') return;
    flowers.push({
      id: node.id,
      depth,
      outline: flowerOutline(members(node).map(at), nestedPadding(depth)),
    });
    for (const child of node.cycle) walk(child, depth + 1);
  };
  for (const node of nodes) walk(node, 0);
  return flowers;
}

/**
 * The picture of a garden: what each sprout, vine and flower looks like now. The views only paint
 * it, so every visual decision (which vine shows lit, which sprout wears a moon, what the fog hides)
 * is made, and tested, here. `kinds` says which sprouts are bees or flowers; a garden that has
 * none leaves it empty.
 */
export function gardenPicture(
  state: GardenState,
  positions: readonly Point[],
  labels: readonly string[],
  extras: PointingExtras,
  kinds: readonly (SproutKind | undefined)[] = [],
): GardenPicture {
  const at = (v: VertexId): Point => itemAt(positions, v);
  const { layer, search, revealed } = state;
  const selected = new Set(
    extras.selection.kind === 'sprout'
      ? [extras.selection.vertex]
      : extras.selection.kind === 'loop'
        ? extras.selection.vertices
        : [],
  );
  const markOf = (v: VertexId): 'sun' | 'moon' | null => {
    const label = search?.label[itemAt(layer.nodeOf, v)];
    return label === 'outer' ? 'sun' : label === 'inner' ? 'moon' : null;
  };

  const sprouts = positions.map((point, vertex) => ({
    vertex,
    x: point.x,
    y: point.y,
    label: labels[vertex] ?? String(vertex),
    kind: kinds[vertex] ?? null,
    lit: !isExposed(state.matching, vertex),
    mark: markOf(vertex),
    selected: selected.has(vertex),
    highlighted: extras.highlight.includes(vertex),
    inChain: extras.chain?.includes(vertex) ?? false,
    scarecrow: state.scarecrows.includes(vertex),
    stone: state.stones.includes(vertex),
  }));

  const glow = extras.vineGlow ?? null;
  const glowing = (u: VertexId, v: VertexId): boolean =>
    glow !== null && ((glow[0] === u && glow[1] === v) || (glow[0] === v && glow[1] === u));
  const vines = state.graph.edges.map(([u, v]) => ({
    u,
    v,
    a: at(u),
    b: at(v),
    lit: isMatchedEdge(state.matching, u, v),
    visible: revealed === null || revealed[u] === true || revealed[v] === true,
    inFlower: layer.nodeOf[u] === layer.nodeOf[v],
    glowing: glowing(u, v),
  }));

  const flowers = flowerPictures(layer.nodes, at);

  const oddGroups =
    state.stones.length === 0
      ? []
      : oddComponents(state.graph, state.stones).map((group) =>
          flowerOutline(group.map(at), GROUP_PADDING),
        );

  return {
    sprouts,
    vines,
    flowers,
    oddGroups,
    fog: revealed === null ? null : { revealed },
    chain:
      extras.chain === null
        ? null
        : { points: extras.chain.map(at), gain: chainGain(state, extras.chain) },
  };
}
