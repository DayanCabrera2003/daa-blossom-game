import type { SproutKind } from '@levels/fields';
import { layerOf, type Controller } from '../systems/levelController';
import { garden } from '../systems/levelSession';
import type { Shape } from './coverage';
import { gardenShapes } from './gardenShapes';
import { layerPicture } from './layerPicture';
import { moonGlow } from './moonGlow';
import { pondPicture } from './pond';
import { referredShapes } from './referredShapes';

/**
 * What a panel opening now should keep clear of (the post-release fix of plan 09): everything the
 * garden shows, and above all what the step on screen and the hint shown point at. The pictures
 * are the ones the level's renderer paints (`scenes/level/LevelRenderer.ts`), taken from the
 * controller as it is. Pure.
 */

/** The shapes of the garden in sight, and those the step on screen points at. */
export interface Avoidance {
  readonly shapes: readonly Shape[];
  readonly referred: readonly Shape[];
}

/** Nothing to keep clear of: a screen with no garden under its panels. */
export const NOTHING_TO_AVOID: Avoidance = { shapes: [], referred: [] };

/**
 * What a panel should keep clear of in the garden of `controller`, whose sprouts are bees or
 * flowers as `kinds` says (empty in a garden of neither).
 */
export function panelAvoidance(
  controller: Controller,
  kinds: readonly (SproutKind | undefined)[] = [],
): Avoidance {
  const { session, pointer, vineGlow, positions } = controller;
  const labels = session.level.data.sprouts.map((sprout) => sprout.label);
  const state = garden(session);
  // What a hint lights up, and in 7.4 the moons still to be lifted, as the renderer shows them.
  const moons = moonGlow(session.level.data.victory, state);
  const highlight = [...new Set([...controller.highlight, ...moons])];
  const extras = { selection: pointer.selection, highlight, chain: pointer.chain, vineGlow };
  const picture = layerPicture(state, layerOf(controller, state), labels, extras, kinds);
  const pond = pondPicture(session, positions, labels);
  return {
    shapes: gardenShapes(picture, pond),
    referred: referredShapes(session, picture, pond),
  };
}
