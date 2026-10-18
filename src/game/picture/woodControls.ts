import type { AssetKey } from '../assets/keys';
import type { WoodPiece } from './wood';

/**
 * The wooden controls of the settings panel (plan 06, section 1.6): the knob of a volume slider and
 * the bar it fills, from the pack's wooden theme, and the mute box, ticked or not. Pure: which
 * picture each control shows, as the panel's state and the pointer have it.
 */

/** The looks of a knob: at rest, under the pointer, and greyed out while everything is muted. */
export type GrabberLook = 'idle' | 'hover' | 'muted';

/** The picture of each look of a knob. */
export const GRABBER: Readonly<Record<GrabberLook, AssetKey>> = {
  idle: 'wood.sliderGrabber',
  hover: 'wood.sliderGrabberHover',
  muted: 'wood.sliderGrabberDisabled',
};

/** A knob's look: muted wins, since a slider moved while muted still sounds nothing. */
export const grabberLook = (muted: boolean, hovered: boolean): GrabberLook =>
  muted ? 'muted' : hovered ? 'hover' : 'idle';

/**
 * The bar filled up to the knob, at rest and under the pointer; its rounded ends keep 3 pixels. No
 * text is written on it, so its face and ink are only those of the piece's shape.
 */
const FILL_SLICES = { left: 3, right: 3, top: 3, bottom: 3 } as const;
export const SLIDER_FILL: Readonly<Record<'idle' | 'hover', WoodPiece>> = {
  idle: { texture: 'wood.sliderProgress', slices: FILL_SLICES, face: { x: 8, y: 8 }, text: 'ink' },
  hover: {
    texture: 'wood.sliderProgressHover',
    slices: FILL_SLICES,
    face: { x: 8, y: 8 },
    text: 'ink',
  },
};

/** What a slider shows: its knob's picture and its bar's piece, lit together under the pointer. */
export function sliderLook(
  muted: boolean,
  hovered: boolean,
): { readonly grabber: AssetKey; readonly fill: WoodPiece } {
  const look = grabberLook(muted, hovered);
  return { grabber: GRABBER[look], fill: SLIDER_FILL[look === 'hover' ? 'hover' : 'idle'] };
}

/** The picture of the mute box: ticked while everything is muted. */
export const checkbox = (ticked: boolean): AssetKey => (ticked ? 'wood.checked' : 'wood.unchecked');
