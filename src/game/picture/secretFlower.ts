import type { SecretFlowerState } from '@services/secretFlowers';
import { frameRect } from '../assets/frames';
import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import type { Rect } from './boxDistance';
import { HUB } from './hubLayout';
import type { TextRef } from './hud';
import { PIXEL_FONT } from './pixelFont';
import type { SheetCut } from './seasons';
import { STAR_SIZE } from './starIcon';
import { WON_FLOWER_SIZE } from './wonFlower';

/**
 * The secret flower of a chapter in the hub (plan 08, section 1.1), grown in the column at the
 * margin beside its chapter's signpost (`flowerBox`), as big as a sprout of the garden so it is
 * found without hunting: while it is shut it is a bud, the two leaves of a sprout, over a dim star
 * and the number of stars still missing; once it opens the pack's flower sways on those leaves in a
 * soft glow, asking to be touched; once won it is a still golden rosette with the star in its
 * middle (`wonFlower.ts`), filling the column, its tip telling the stars it gave. Every piece is
 * drawn inside the column; the column and the signpost together take the touch. Pure: the scene draws what this says and does what a touch asks.
 */

/** The leaves of the sprout's tile, without the empty rows and columns around them. */
const SPROUT = frameRect('sproutLeaves');
export const BUD_CUT: SheetCut = {
  sheet: 'tiles.floorDetail',
  x: SPROUT.x + 1,
  y: SPROUT.y + 4,
  width: 13,
  height: 9,
};

/** The size of a frame of the pack's animated flower (`anim.flower`, two frames side by side). */
export const BLOOM_SIZE = { width: 10, height: 8 } as const;

/** Something drawn in the flower's column, its top-left corner on the canvas. */
export type FlowerPiece =
  | { readonly kind: 'bud'; readonly x: number; readonly y: number }
  /** The pack's open flower, swaying between the two frames of its picture. */
  | { readonly kind: 'bloom'; readonly x: number; readonly y: number }
  /** The golden rosette of a won flower (`wonFlower.ts`), still. */
  | { readonly kind: 'won'; readonly x: number; readonly y: number }
  /** The soft light that pulses behind an open flower, filling the box. */
  | {
      readonly kind: 'glow';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  /** A star of the score: in sunlight once earned, in dim wood while still missing. */
  | { readonly kind: 'star'; readonly x: number; readonly y: number; readonly earned: boolean }
  /**
   * A number in the pixel font beside the star; `y` is the top of its digits (a capital's height
   * below the top of the line the scene writes).
   */
  | { readonly kind: 'count'; readonly x: number; readonly y: number; readonly text: string };

/** What a touch on the flower (or Enter on it) does. */
export type FlowerPress =
  /** Enters the flower, a level of the catalog. */
  | { readonly kind: 'play' }
  /** Says why the flower is still shut. */
  | { readonly kind: 'tell'; readonly text: TextRef };

/** What the hub draws for a chapter's flower, where it is touched, and what that does. */
export interface FlowerPicture {
  readonly pieces: readonly FlowerPiece[];
  /** The box that takes the touch, the flower's column and its signpost; null with no flower. */
  readonly hit: Rect | null;
  /** The short text shown while the pointer or the keyboard is on the flower. */
  readonly tip: TextRef | null;
  readonly press: FlowerPress | null;
}

/**
 * A dim star and `count` (the stars still missing) beside it, a pixel apart, centred across the
 * column `cell` with their tops `top` pixels down it.
 */
function starAndCount(cell: Rect, top: number, count: number): FlowerPiece[] {
  const text = String(count);
  const width = STAR_SIZE + 1 + text.length * PIXEL_FONT.advance;
  const x = cell.x + Math.floor((cell.width - width) / 2);
  const y = cell.y + top;
  return [
    { kind: 'star', x, y, earned: false },
    { kind: 'count', x: x + STAR_SIZE + 1, y, text },
  ];
}

/** The flower in `state` in its column `cell`, beside its chapter's signpost `sign`. */
export function secretFlowerPicture(
  state: SecretFlowerState,
  cell: Rect,
  sign: Rect,
): FlowerPicture {
  if (state.kind === 'none') return { pieces: [], hit: null, tip: null, press: null };
  const { x, y } = cell;
  // Centred across the column: the leaves at the top of a bud, or under an open flower.
  const leavesX = x + Math.floor((cell.width - BUD_CUT.width) / 2);
  const bloomX = x + Math.floor((cell.width - BLOOM_SIZE.width) / 2);
  // The row of the star and its number, along the bottom of the column.
  const countTop = cell.height - STAR_SIZE;
  const hit: Rect = {
    x: Math.min(cell.x, sign.x),
    y: Math.min(cell.y, sign.y),
    width: Math.max(cell.x + cell.width, sign.x + sign.width) - Math.min(cell.x, sign.x),
    height: Math.max(cell.y + cell.height, sign.y + sign.height) - Math.min(cell.y, sign.y),
  };
  switch (state.kind) {
    case 'bud': {
      const missing = state.need - state.have;
      return {
        pieces: [{ kind: 'bud', x: leavesX, y }, ...starAndCount(cell, countTop, missing)],
        hit,
        tip: { key: 'hub.secret.budTip', params: { missing } },
        press: {
          kind: 'tell',
          text: { key: 'hub.secret.bud', params: { need: state.need, have: state.have } },
        },
      };
    }
    case 'open':
      return {
        pieces: [
          { kind: 'glow', ...cell },
          // The leaves at the bottom; the flower opens over their top row.
          { kind: 'bud', x: leavesX, y: y + cell.height - BUD_CUT.height },
          { kind: 'bloom', x: bloomX, y },
        ],
        hit,
        tip: { key: 'hub.secret.openTip', params: {} },
        press: { kind: 'play' },
      };
    case 'won':
      return {
        pieces: [
          {
            kind: 'won',
            x: x + Math.floor((cell.width - WON_FLOWER_SIZE) / 2),
            y: y + Math.floor((cell.height - WON_FLOWER_SIZE) / 2),
          },
        ],
        hit,
        tip: { key: 'hub.secret.wonTip', params: { stars: state.stars } },
        press: { kind: 'play' },
      };
  }
}

/** The tip of a flower: the clear space round its words inside its dark patch, and its place. */
export const FLOWER_TIP = {
  pad: { x: 3, y: 1 },
  /** From the top of the hub's garden bed to the top of the tip. */
  gap: 1,
} as const;

/**
 * Where the tip of a flower `width` × `height` goes: at the margin, along the top of the hub's
 * garden bed, under the last chapter. Written beside its flower it covered the chapter's title and
 * buttons (the review of plan 09, phase 4); the bed is the one strip of the hub where nothing is
 * read or pressed (its pieces are scenery, the way to the epilogue sits at its bottom), so the tip
 * there never hides a button, a title or a signpost, and it is always in the same place, under the
 * column of the flowers, while the flower it tells of wears its ring. Kept on the canvas however
 * long or tall it is.
 */
export function flowerTipAt(width: number, height: number): Point {
  const x = Math.max(0, Math.min(HUB.margin, CANVAS_WIDTH - width));
  const y = Math.max(0, Math.min(HUB.gardenTop + FLOWER_TIP.gap, CANVAS_HEIGHT - height));
  return { x, y };
}
