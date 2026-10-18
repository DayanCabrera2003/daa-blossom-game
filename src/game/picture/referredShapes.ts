import { members } from '@core/blossom/hierarchy';
import { findConflict } from '@core/search/conflict';
import { itemAt } from '@core/shared/itemAt';
import type { Shape } from './coverage';
import type { GardenPicture } from './garden';
import { sproutShapes, strandShapes, vineShape } from './gardenShapes';
import { pondPieces } from '../systems/pond';
import { garden, stepNow, type LevelSession } from '../systems/levelSession';
import { shownReflection } from './pond';
import type { PondPicture } from './tangle';

/**
 * What the step on screen points at (the post-release fix of plan 09), as shapes a panel must not
 * hide when it can sit elsewhere: the thread or loop a count asks about (chapter 2), the threads
 * the reflection wins (2.5), the loop of the conflict whose sprouts are counted (4.2), and whatever
 * a hint lights: its sprouts and the vine it makes glow. Pure.
 */

/**
 * The shapes of the pieces of the tangle whose indices `wanted` picks among the pieces of
 * `yours ⊕ mirror`, as the pond draws them now.
 */
function piecesOf(
  session: LevelSession,
  pond: PondPicture | null,
  wanted: (piece: { readonly sprouts: readonly number[]; readonly gain: number }) => boolean,
): Shape[] {
  const mirror = shownReflection(session);
  if (pond === null || mirror === null) return [];
  const picked = new Set(
    pondPieces(garden(session).matching, mirror).flatMap((piece, index) =>
      wanted(piece) ? [index] : [],
    ),
  );
  return strandShapes(pond, (piece) => piece !== null && picked.has(piece));
}

/** The sprouts of the loop the conflict of the player's search closes, and its vines. */
function conflictLoop(session: LevelSession, picture: GardenPicture): Shape[] {
  const { layer, search } = garden(session);
  const conflict = findConflict(layer, search);
  if (conflict === null) return [];
  const sprouts = new Set(conflict.loop.flatMap((node) => members(itemAt(layer.nodes, node))));
  return [
    ...picture.sprouts
      .filter((sprout) => sprouts.has(sprout.vertex))
      .flatMap((sprout) => sproutShapes(sprout)),
    ...picture.vines
      .filter((vine) => vine.visible && sprouts.has(vine.u) && sprouts.has(vine.v))
      .map((vine) => vineShape(vine.a, vine.b)),
  ];
}

/** What the step on screen asks about, if it asks about a piece of the garden. */
function stepPieces(
  session: LevelSession,
  picture: GardenPicture,
  pond: PondPicture | null,
): Shape[] {
  const step = stepNow(session);
  if (step?.step !== 'count') return [];
  switch (step.of) {
    case 'loop':
      return conflictLoop(session, picture);
    case 'winningThreads':
      return piecesOf(session, pond, (piece) => piece.gain > 0);
    default:
      return piecesOf(session, pond, (piece) => piece.sprouts.includes(step.piece));
  }
}

/**
 * Every shape the step on screen and the hint shown point at, in the garden's `picture` and the
 * pond's `pond` as they are drawn now.
 */
export function referredShapes(
  session: LevelSession,
  picture: GardenPicture,
  pond: PondPicture | null,
): Shape[] {
  const lit = picture.sprouts
    .filter((sprout) => sprout.highlighted)
    .flatMap((sprout) => sproutShapes(sprout));
  const glowing = picture.vines
    .filter((vine) => vine.glowing)
    .map((vine) => vineShape(vine.a, vine.b));
  return [...stepPieces(session, picture, pond), ...lit, ...glowing];
}
