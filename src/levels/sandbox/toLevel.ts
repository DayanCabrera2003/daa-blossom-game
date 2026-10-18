import { edmonds } from '@core/edmonds/solve';
import { maximumSize } from '@core/edmonds/fast/maximum';
import { nameOf } from '@core/graph/labels';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import type { ActionType } from '@core/rules/actions';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { Result } from '@core/shared/result';
import type { z } from 'zod';
import type { Level } from '../build';
import { buildGarden } from '../garden';
import { loadLevel, type LoadError } from '../loader';
import type { levelSchema } from '../schema';
import type { Design } from './design';

/**
 * A garden of the free mode as a level (plan 08, phase 8): the same JSON as the files of
 * `levels/data/`, so a design is exported, imported and played through the very schema, builder
 * and checks of the catalog, with no second engine.
 */

/** A level file as written, before the schema fills in its defaults. */
export type LevelFile = z.input<typeof levelSchema>;

/**
 * The id of an exported garden: chapter 9 does not exist, so the level unlocks every action and
 * belongs to no chapter; as a draft only teacher mode would show it. Copied into `levels/data/`, it
 * is given its own id there.
 */
export const SANDBOX_LEVEL_ID = '9.1';

/** Every action of the game. */
const ALL_ACTIONS = Object.keys(UNLOCKED_AT) as ActionType[];

/**
 * The reference walkthrough of a design: the chains that take its lanterns to a maximum, read from
 * Edmonds' answer as the pieces of the difference that gain a lantern (each runs between two
 * sprouts in the dark), then "Terminé". A garden already at its maximum is only "Terminé".
 */
function referenceSolution(design: Design): LevelFile['solution'] {
  const done = { type: 'declareDone' as const };
  const built = buildGarden({
    names: design.sprouts.map((sprout) => sprout.label),
    vines: design.vines,
    lanterns: design.lanterns,
  });
  // A broken garden has no chains to give; loading the file says what is wrong with it.
  if (!built.ok) return [done];
  const { labels, graph, matching } = built.value;
  const best = edmonds(graph, matching).matching;
  const chains = decomposeSymmetricDifference(matching, best)
    .filter((piece) => piece.gain > 0)
    .map((piece) => ({
      type: 'chain' as const,
      path: piece.vertices.map((vertex) => nameOf(labels, vertex)),
    }));
  return [...chains, done];
}

/**
 * The level file of a design, as the free mode exports it: a draft of chapter 9 with the garden's
 * sprouts (names, places, bees and flowers), vines and lanterns, a hidden goal won by lighting all
 * it can and saying "Terminé", the default script and a reference walkthrough, so the catalog's
 * integrity checks accept it. An empty design gives a file the schema refuses: it has no garden.
 */
export function toLevelFile(design: Design): LevelFile {
  return {
    id: SANDBOX_LEVEL_ID,
    draft: true,
    sprouts: design.sprouts.map((sprout) => ({ ...sprout })),
    vines: design.vines.map(([u, v]) => [u, v]),
    lanterns: design.lanterns.map(([u, v]) => [u, v]),
    goal: { visible: false },
    victory: { type: 'maximum' },
    flow: [{ step: 'play' }],
    solution: referenceSolution(design),
  };
}

/**
 * The actions a garden without fog never takes: inspecting only lifts fog (the rules refuse it
 * elsewhere), so the free mode leaves its tool off the toolbar.
 */
const FOG_ACTIONS: readonly ActionType[] = ['inspect'];

/**
 * A design ready to play with the actions the player has: those `allowed`, the rest forbidden, and
 * never inspecting, since the free mode has no fog. With "Terminé" learnt (1.8) the goal is hidden
 * as in the exported file; before, the garden shows its optimum and is won by lighting that many
 * lanterns. It loads as any level does, so a broken or empty design comes back as the loader's
 * reason.
 */
export function toPlayable(
  design: Design,
  allowed: readonly ActionType[],
): Result<Level, LoadError> {
  const file = toLevelFile(design);
  const forbid = ALL_ACTIONS.filter(
    (action) => !allowed.includes(action) || FOG_ACTIONS.includes(action),
  );
  if (allowed.includes('declareDone')) return loadLevel({ ...file, forbid });
  const garden = buildGarden({
    names: design.sprouts.map((sprout) => sprout.label),
    vines: design.vines,
    lanterns: [],
  });
  const optimum = garden.ok ? maximumSize(garden.value.graph) : 0;
  return loadLevel({
    ...file,
    forbid,
    goal: { visible: true, value: optimum },
    victory: { type: 'matchingSize', value: optimum },
  });
}
