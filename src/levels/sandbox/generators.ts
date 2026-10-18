import { randomBipartiteGraph } from '@core/generators/bipartite';
import { completeGraph, cycleGraph, pathGraph, starGraph } from '@core/generators/families';
import { helix, longStemFlower, manyFlowers, nestedFlowers } from '@core/generators/hardCases';
import { randomGraph } from '@core/generators/random';
import type { Graph, VertexId } from '@core/graph/types';
import type { Matching } from '@core/matching/types';
import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import { createRng, type Rng } from '@core/shared/rng';
import type { Design, DesignPair } from './design';
import { layoutGarden, sideKind, type LayoutShape } from './layout';
import { MAX_SPROUTS, MAX_VINES } from './limits';
import { LETTERS } from './names';

/**
 * The generators of the free mode (plan 08, section 1.3): each grows a garden with a family of the
 * core, lays it out with `layout` and names its sprouts A, B, C… in the order the core grows them.
 * The gardens of flowers bring the lanterns that make their flowers appear; the rest start in the
 * dark. Random ones are grown from a seed, so the same seed always grows the same garden and
 * "Otro al azar" only changes the seed. A garden that would pass the free mode's vines is grown
 * again smaller, from the same seed, until it fits.
 */

/** The generators, in the order the generate menu offers them. */
export const GENERATOR_IDS = [
  'path',
  'cycle',
  'star',
  'complete',
  'random',
  'beesFlowers',
  'longStem',
  'nested',
  'helix',
  'manyFlowers',
] as const;

/** A generator of the free mode. */
export type GeneratorId = (typeof GENERATOR_IDS)[number];

/** What a family of the core grows: a garden, with its lanterns for the gardens of flowers. */
interface Grown {
  readonly graph: Graph;
  readonly matching?: Matching;
  /** Bees (0) and flowers (1), for a garden of bees and flowers. */
  readonly side?: readonly (0 | 1)[];
}

/** A generator: its name, the sizes it offers and how it grows a garden of a size. */
export interface GardenGenerator {
  readonly id: GeneratorId;
  /** The key of its name in the game's strings. */
  readonly textKey: `sandbox.gen.${GeneratorId}`;
  /** The smallest and largest size offered (sprouts, leaves, stem, depth, arms or flowers). */
  readonly min: number;
  readonly max: number;
  /** Whether it brings lanterns of its own. */
  readonly lit: boolean;
  /** Whether it grows bees and flowers, so the garden can be guarded by scarecrows. */
  readonly beesAndFlowers: boolean;
  /** Whether the seed changes what it grows ("Otro al azar" only for these). */
  readonly random: boolean;
}

/** A generator with what only this file needs: the core's family and the shape to lay it out. */
interface Recipe extends GardenGenerator {
  readonly grow: (size: number, rng: Rng) => Grown;
  readonly shape: 'row' | 'ring' | 'layers';
}

/** How likely a random vine is, drawn from the seed: from 0.15 to 0.5 (section 1.3). */
const vineChance = (rng: Rng): number => 0.15 + 0.35 * rng.next();

/** A garden of bees and flowers of `size` sprouts: half bees (rounded up), the rest flowers. */
const beesAndFlowers = (size: number, rng: Rng): Grown => {
  const bees = Math.ceil(size / 2);
  const graph = randomBipartiteGraph(bees, size - bees, vineChance(rng), rng);
  return { graph, side: Array.from({ length: size }, (_, v) => (v < bees ? 0 : 1)) };
};

/** What sets a generator apart from a plain one: lanterns, bees and flowers, randomness. */
type Traits = Partial<Pick<GardenGenerator, 'lit' | 'beesAndFlowers' | 'random'>>;

/** A generator: in the dark, plain and not random unless `traits` says otherwise. */
const recipe = (
  id: GeneratorId,
  [min, max]: readonly [number, number],
  shape: Recipe['shape'],
  grow: Recipe['grow'],
  traits: Traits = {},
): Recipe => ({
  id,
  textKey: `sandbox.gen.${id}`,
  min,
  max,
  lit: traits.lit ?? false,
  beesAndFlowers: traits.beesAndFlowers ?? false,
  random: traits.random ?? false,
  grow,
  shape,
});

/** A family of the core that only takes a size, as a way to grow. */
const sized =
  (family: (size: number) => Graph): Recipe['grow'] =>
  (size) => ({ graph: family(size) });

/** Every generator, in the order of `GENERATOR_IDS`. */
const RECIPES: readonly Recipe[] = [
  recipe('path', [2, 20], 'row', sized(pathGraph)),
  recipe('cycle', [3, 20], 'ring', sized(cycleGraph)),
  // The centre stands to the left of its leaves.
  recipe('star', [2, 12], 'layers', sized(starGraph)),
  recipe('complete', [2, 8], 'ring', sized(completeGraph)),
  recipe(
    'random',
    [4, 20],
    'ring',
    (size, rng) => ({ graph: randomGraph(size, vineChance(rng), rng) }),
    {
      random: true,
    },
  ),
  recipe('beesFlowers', [4, 20], 'layers', beesAndFlowers, { beesAndFlowers: true, random: true }),
  // The hard cases of the core come with the lanterns that make their flowers appear.
  recipe('longStem', [1, 6], 'layers', longStemFlower, { lit: true }),
  recipe('nested', [1, 4], 'layers', nestedFlowers, { lit: true }),
  recipe('helix', [2, 5], 'layers', helix, { lit: true }),
  recipe('manyFlowers', [1, 5], 'layers', manyFlowers, { lit: true }),
];

/** The generators of the free mode, as the generate menu lists them. */
export const GENERATORS: readonly GardenGenerator[] = RECIPES;

/** The generator `id`. */
export function generatorOf(id: GeneratorId): GardenGenerator {
  return recipeOf(id);
}

/** The recipe of the generator `id`. */
function recipeOf(id: GeneratorId): Recipe {
  const recipe = RECIPES.find((candidate) => candidate.id === id);
  invariant(recipe !== undefined, `no generator ${id}`);
  return recipe;
}

/** What a generator grew: the design, the size it was grown at, and whether it had to shrink. */
export interface Generated {
  readonly design: Design;
  readonly size: number;
  readonly shrunk: boolean;
}

/** The design of a grown garden: laid out, named in order, bees and flowers when it has them. */
function toDesign(grown: Grown, shape: Recipe['shape']): Design {
  const { graph, matching, side } = grown;
  invariant(graph.n <= MAX_SPROUTS, `a generator grew ${graph.n} sprouts`);
  const layout: LayoutShape = side === undefined ? { kind: shape } : { kind: 'sides', side };
  const name = (vertex: VertexId): string => itemAt(LETTERS, vertex);
  const pair = ([u, v]: readonly [VertexId, VertexId]): DesignPair => [name(u), name(v)];
  return {
    sprouts: layoutGarden(graph, layout).map(({ x, y }, vertex) =>
      side === undefined
        ? { label: name(vertex), x, y }
        : { label: name(vertex), x, y, kind: sideKind(itemAt(side, vertex)) },
    ),
    vines: graph.edges.map(pair),
    lanterns:
      matching === undefined
        ? []
        : graph.edges.filter(([u, v]) => matching.mate[u] === v).map(pair),
  };
}

/**
 * The garden the generator `id` grows at `size` from `seed`. If it would pass the vines of the
 * free mode, it is grown again from the same seed one size smaller, until it fits; the outcome says
 * the size it was grown at, so the menu can tell the player it shrank.
 */
export function generate(id: GeneratorId, size: number, seed: number): Generated {
  const chosen = recipeOf(id);
  invariant(
    Number.isInteger(size) && size >= chosen.min && size <= chosen.max,
    `${id} grows sizes ${chosen.min} to ${chosen.max}, not ${size}`,
  );
  let tried = size;
  let grown = chosen.grow(tried, createRng(seed));
  while (grown.graph.edges.length > MAX_VINES) {
    // Every generator fits at its smallest size: six vines at most.
    invariant(tried > chosen.min, `${id} grows too many vines even at size ${tried}`);
    tried -= 1;
    grown = chosen.grow(tried, createRng(seed));
  }
  return { design: toDesign(grown, chosen.shape), size: tried, shrunk: tried < size };
}
