import { assetEntry, type AssetKey } from '../assets/keys';
import type { ToolId } from '../input/tools';

/**
 * The icons of the pack drawn on buttons and panels (plan 06, section 1.6): a picture and the scale
 * it is drawn at, so a 24 × 24 skill icon sits on a button a line of text tall. The sun of the pack
 * is the tool of marks (it puts the suns and the moons) and the handle of the sun on the top bar;
 * the rock is the tool of stones, and the hourglass marks the races. The toolbar has no room for a
 * moon beside the sun: with every tool open and a wider fallback face, it would leave the canvas.
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
