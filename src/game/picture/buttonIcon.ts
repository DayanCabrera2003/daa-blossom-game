import { assetEntry, type AssetKey } from '../assets/keys';
import type { ToolId } from '../input/tools';

/**
 * The icons of the pack drawn on buttons (plan 06, section 1.6): a picture and the scale it is
 * drawn at, so a 24 × 24 skill icon sits on a button a line of text tall. The sun of the pack is
 * the tool of marks (it puts the suns and the moons) and the handle of the sun on the top bar.
 */
export interface ButtonIcon {
  readonly texture: AssetKey;
  readonly scale: number;
}

/** Between an icon and the label after it, in pixels. */
export const ICON_GAP = 2;

/** The sun of the pack at half its size: 12 pixels, a line of text. */
export const SUN_ICON: ButtonIcon = { texture: 'icon.sun', scale: 0.5 };

/** The tools whose button shows an icon before its name. */
export const TOOL_ICONS: Readonly<Partial<Record<ToolId, ButtonIcon>>> = { marks: SUN_ICON };

/** How much wider an icon makes a button: the icon as drawn and the gap after it. */
export function iconRoom(icon: ButtonIcon | null): number {
  if (icon === null) return 0;
  const width = assetEntry(icon.texture).image?.width ?? 0;
  return width * icon.scale + ICON_GAP;
}
