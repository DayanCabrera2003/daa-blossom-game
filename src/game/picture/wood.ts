import type { AssetKey } from '../assets/keys';
import type { PixelRect } from '../assets/frames';
import type { Slices } from './nineSlice';

/**
 * The wooden pieces of the interface (plan 06, section 1.6): the panel of questions, the notebook,
 * the cards, the victory and the toasts; the box of dialogue; and the buttons, at rest, in hand and
 * switched off. Each is a picture of the Ninja Adventure pack stretched as a 9-slice, with the
 * colour its text is written in: `tests/wood.test.ts` measures that colour against the very pixels
 * of the face and holds it to the contrast WCAG asks of body text (4.5). The pack's plain button,
 * an orange face, leaves no colour that reaches it, light or dark; so a button at rest is its
 * lighter face with dark letters, and the one in hand its sunken, darker face with light letters,
 * which also tells them apart at a glance.
 */

/** A colour of `view/palette.ts` that text is written in on wood. */
export type WoodInk = 'ink' | 'label';

/** A wooden piece: its picture, where its border ends, a pixel of its face and its text's colour. */
export interface WoodPiece {
  readonly texture: AssetKey;
  readonly slices: Slices;
  /** A pixel of the face the text is written on, in the picture. */
  readonly face: { readonly x: number; readonly y: number };
  readonly text: WoodInk;
}

/** The panel: a thick frame around a warm face. */
export const WOOD_PANEL: WoodPiece = {
  texture: 'wood.panel',
  slices: { left: 6, right: 5, top: 6, bottom: 5 },
  face: { x: 8, y: 8 },
  text: 'ink',
};

/** The three looks of a button. */
export const BUTTON_STATES = ['idle', 'active', 'off'] as const;

/** A button at rest, the one in hand (the tool in use, the option the mentor points at), or off. */
export type ButtonState = (typeof BUTTON_STATES)[number];

/** Each look of a button; the sunken one is a pixel lower, so its top border is a pixel taller. */
export const WOOD_BUTTON: Readonly<Record<ButtonState, WoodPiece>> = {
  idle: {
    texture: 'wood.buttonHover',
    slices: { left: 2, right: 2, top: 2, bottom: 2 },
    face: { x: 8, y: 3 },
    text: 'ink',
  },
  active: {
    texture: 'wood.buttonPressed',
    slices: { left: 2, right: 2, top: 3, bottom: 1 },
    face: { x: 8, y: 4 },
    text: 'label',
  },
  off: {
    texture: 'wood.buttonDisabled',
    slices: { left: 2, right: 2, top: 2, bottom: 2 },
    face: { x: 8, y: 3 },
    text: 'label',
  },
};

/**
 * The dialogue box: a light page with a wooden tab on its top-left corner, which keeps its size
 * (the left border is as wide as the tab) and holds the speaker's name.
 */
export const WOOD_DIALOGUE: WoodPiece & {
  /** The tab: where a name fits on it, from the box's top-left corner, and its colours. */
  readonly tab: PixelRect & { readonly face: { x: number; y: number }; readonly text: WoodInk };
} = {
  texture: 'ui.dialogBox',
  slices: { left: 71, right: 8, top: 15, bottom: 6 },
  face: { x: 150, y: 30 },
  text: 'ink',
  tab: { x: 5, y: 0, width: 64, height: 12, face: { x: 20, y: 4 }, text: 'label' },
};
