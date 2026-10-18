import { assetEntry, type AssetKey } from '../assets/keys';
import type { ToolId } from '../input/tools';
import type { Rect } from './boxDistance';

/**
 * The icons of the pack drawn on buttons and panels (plan 06, section 1.6): a picture and the scale
 * it is drawn at, so a 24 × 24 skill icon sits on a button a line of text tall. The sun of the pack
 * is the tool of marks (it puts the suns and the moons) and the handle of the sun on the top bar;
 * the rock is the tool of stones, and the hourglass marks the races. The toolbar has no room for a
 * moon beside the sun: with every tool open and a wider fallback face, it would leave the canvas.
 * So the moon is a badge (plan 09, phase 2; plan 09, appendix A, question 15): drawn small over
 * the bottom-right corner of the sun, it takes no room of its own and the button keeps its size.
 */
export interface ButtonIcon {
  readonly texture: AssetKey;
  readonly scale: number;
}

/** Between an icon and what comes after it (another icon, the label), in pixels. */
export const ICON_GAP = 2;

/** The sun of the pack at half its size: 12 pixels, a line of text. */
export const SUN_ICON: ButtonIcon = { texture: 'icon.sun', scale: 0.5 };

/** The rock of the pack at half its size: 8 pixels, a stone beside its name. */
export const ROCK_ICON: ButtonIcon = { texture: 'icon.rock', scale: 0.5 };

/** The hourglass of the pack, as it is, before the title of a race. */
export const RACE_ICON: ButtonIcon = { texture: 'icon.hourglass', scale: 1 };

/** The book of the pack at half its size (8 pixels), before the name of the Códex on its buttons. */
export const BOOK_ICON: ButtonIcon = { texture: 'icon.book', scale: 0.5 };

/** The moon of the pack at a third of its size: a badge of 8 × 8 pixels on the sun's corner. */
export const MOON_BADGE: ButtonIcon = { texture: 'icon.moon', scale: 1 / 3 };

/** The tools whose button shows icons before its name, in order. */
export const TOOL_ICONS: Readonly<Partial<Record<ToolId, readonly ButtonIcon[]>>> = {
  marks: [SUN_ICON],
  stones: [ROCK_ICON],
};

/** How much wider icons make a button: each icon as drawn and the gap after it. */
export function iconRoom(icons: readonly ButtonIcon[]): number {
  return icons.reduce(
    (room, icon) => room + (assetEntry(icon.texture).image?.width ?? 0) * icon.scale + ICON_GAP,
    0,
  );
}

/** The tools whose first icon wears a badge on its corner, without text. */
export const TOOL_BADGES: Readonly<Partial<Record<ToolId, ButtonIcon>>> = {
  marks: MOON_BADGE,
};

/**
 * Where a badge `size` pixels square sits on the icon at `icon`: over its bottom-right corner,
 * a pixel past the icon's edges, into the gap before the label, so it never reaches the letters.
 */
export function badgeAt(icon: Rect, size: number): Rect {
  return {
    x: icon.x + icon.width + 1 - size,
    y: icon.y + icon.height + 1 - size,
    width: size,
    height: size,
  };
}

/**
 * Where the pieces of a button go when its label's line starts at (`x`, `y`) and its wood, a pixel
 * higher, is `height` tall: each icon (of the size it is drawn at) two pixels in from the wood's
 * left edge and centred on its height, a gap after each, and the label after the last gap.
 */
export function buttonContent(
  x: number,
  y: number,
  height: number,
  icons: readonly { readonly width: number; readonly height: number }[],
): { icons: Rect[]; labelX: number } {
  let left = x + 2;
  const placed = icons.map((icon): Rect => {
    const rect = {
      x: left,
      y: Math.round(y - 1 + (height - icon.height) / 2),
      width: icon.width,
      height: icon.height,
    };
    left += icon.width + ICON_GAP;
    return rect;
  });
  return { icons: placed, labelX: left };
}
