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

/**
 * The secret flower of a chapter in the hub (plan 08, section 1.1), grown in the column at the
 * margin beside its chapter's signpost (`flowerBox`), as big as a sprout of the garden so it is
 * found without hunting: while it is shut it is a bud, the two leaves of a sprout, over a dim star
 * and the number of stars still missing; once it opens the pack's flower sways on those leaves in a
 * soft glow, asking to be touched; once won it is golden and still, over a golden star and the
 * number of stars it gave. Every piece is drawn inside the column; the column and the signpost
 * together take the touch. Pure: the scene draws what this says and does what a touch asks.
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
  | {
      readonly kind: 'bloom';
      readonly x: number;
      readonly y: number;
      /** Whether it sways between the two frames of its picture (an open flower, alive). */
      readonly sways: boolean;
      /** Whether it is tinted gold (a won flower). */
      readonly golden: boolean;
    }
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
   * below the top of the line the scene writes), golden for a won flower.
   */
  | {
      readonly kind: 'count';
      readonly x: number;
      readonly y: number;
      readonly text: string;
      readonly golden: boolean;
    };

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
 * A star and `count` beside it, a pixel apart, centred across the column `cell` with their tops
 * `top` pixels down it.
 */
function starAndCount(cell: Rect, top: number, count: number, won: boolean): FlowerPiece[] {
  const text = String(count);
  const width = STAR_SIZE + 1 + text.length * PIXEL_FONT.advance;
  const x = cell.x + Math.floor((cell.width - width) / 2);
  const y = cell.y + top;
  return [
    { kind: 'star', x, y, earned: won },
    { kind: 'count', x: x + STAR_SIZE + 1, y, text, golden: won },
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
        pieces: [{ kind: 'bud', x: leavesX, y }, ...starAndCount(cell, countTop, missing, false)],
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
          { kind: 'bloom', x: bloomX, y, sways: true, golden: false },
        ],
        hit,
        tip: { key: 'hub.secret.openTip', params: {} },
        press: { kind: 'play' },
      };
    case 'won':
      return {
        pieces: [
          { kind: 'bloom', x: bloomX, y, sways: false, golden: true },
          ...starAndCount(cell, countTop, state.stars, true),
        ],
        hit,
        tip: { key: 'hub.secret.wonTip', params: { stars: state.stars } },
        press: { kind: 'play' },
      };
  }
}

/**
 * Where the tip of a flower `width` × `height` goes: just right of the box `sign` that takes its
 * touch (its column and signpost), over the chapter's title for as long as it is shown, centred on
 * its height; pulled back inside the canvas margins when it is long.
 */
export function flowerTipAt(sign: Rect, width: number, height: number): Point {
  const x = Math.max(
    HUB.margin,
    Math.min(sign.x + sign.width + 2, CANVAS_WIDTH - HUB.margin - width),
  );
  const y = Math.max(
    0,
    Math.min(sign.y + Math.round((sign.height - height) / 2), CANVAS_HEIGHT - height),
  );
  return { x, y };
}
