import type { SecretFlowerState } from '@services/secretFlowers';
import { frameRect } from '../assets/frames';
import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import type { Rect } from './boxDistance';
import { HUB } from './hubLayout';
import type { TextRef } from './hud';
import type { SheetCut } from './seasons';
import { STAR_SIZE } from './starIcon';

/**
 * The secret flower of a chapter on its signpost in the hub (plan 08, section 1.1), in the garden's
 * own pictures: while the flower is shut it is a bud, the two leaves of a sprout; once it opens it
 * is the flower of the pack, swaying; once won it is golden and still, over a star. Every piece is
 * drawn inside the signpost, and the whole signpost takes the touch, so the flower never covers a
 * title or a button. Pure: the scene draws what this says and does what a touch asks.
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

/** Something drawn on the signpost, its top-left corner on the canvas. */
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
  | { readonly kind: 'star'; readonly x: number; readonly y: number };

/** What a touch on the flower (or Enter on it) does. */
export type FlowerPress =
  /** Enters the flower, a level of the catalog. */
  | { readonly kind: 'play' }
  /** Says why the flower is still shut. */
  | { readonly kind: 'tell'; readonly text: TextRef };

/** What the hub draws for a chapter's flower, where it is touched, and what that does. */
export interface FlowerPicture {
  readonly pieces: readonly FlowerPiece[];
  /** The box that takes the touch, the signpost; null when there is no flower. */
  readonly hit: Rect | null;
  /** The short text shown while the pointer or the keyboard is on the flower. */
  readonly tip: TextRef | null;
  readonly press: FlowerPress | null;
}

/** The flower in `state` on the signpost `sign`. */
export function secretFlowerPicture(state: SecretFlowerState, sign: Rect): FlowerPicture {
  const { x, y } = sign;
  // Centred across the signpost; the board's top rim is its first row.
  const bloomX = x + Math.floor((sign.width - BLOOM_SIZE.width) / 2);
  switch (state.kind) {
    case 'none':
      return { pieces: [], hit: null, tip: null, press: null };
    case 'bud':
      return {
        pieces: [{ kind: 'bud', x: x + Math.floor((sign.width - BUD_CUT.width) / 2), y: y + 1 }],
        hit: sign,
        tip: { key: 'hub.secret.budTip', params: { missing: state.need - state.have } },
        press: {
          kind: 'tell',
          text: { key: 'hub.secret.bud', params: { need: state.need, have: state.have } },
        },
      };
    case 'open':
      return {
        pieces: [{ kind: 'bloom', x: bloomX, y: y + 2, sways: true, golden: false }],
        hit: sign,
        tip: { key: 'hub.secret.openTip', params: {} },
        press: { kind: 'play' },
      };
    case 'won':
      return {
        pieces: [
          { kind: 'bloom', x: bloomX, y, sways: false, golden: true },
          // The star of the score, under the flower, on the board.
          {
            kind: 'star',
            x: x + Math.floor((sign.width - STAR_SIZE) / 2),
            y: y + BLOOM_SIZE.height + 1,
          },
        ],
        hit: sign,
        tip: { key: 'hub.secret.wonTip', params: { stars: state.stars } },
        press: { kind: 'play' },
      };
  }
}

/**
 * Where the tip of a flower `width` × `height` goes: just right of its signpost, over the chapter's
 * title for as long as it is shown, centred on the signpost's height; pulled back inside the
 * canvas margins when it is long.
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
