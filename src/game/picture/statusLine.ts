import { ICON_GAP } from './buttonIcon';
import { PIXEL_FONT } from './pixelFont';

/**
 * The air of the HUD's status line: three letters between its parts while there is room, never
 * less than one, and the gap between the water's drop and its numbers.
 */
export const STATUS_LINE = {
  gap: 3 * PIXEL_FONT.advance,
  minGap: PIXEL_FONT.advance,
  iconGap: ICON_GAP,
} as const;

/** What the left part of the status line holds, measured by the HUD. */
export interface StatusParts {
  /** Where the line starts: the lanterns lit are written there. */
  readonly start: number;
  /** The width of the lanterns lit. */
  readonly lanterns: number;
  /** The width of the water's drop, drawn before the water spent. */
  readonly drop: number;
  /**
   * The width of the water spent, with its word ("Agua: 3/5") and without it ("3/5", the drop
   * saying the rest); null where the level has no water.
   */
  readonly water: { readonly full: number; readonly short: number } | null;
  /** The width of the depth of the layers, or null when not inside a flower. */
  readonly layer: number | null;
}

/** Where the drop, the water and the layers go, and whether the water lost its word. */
export interface StatusPlaces {
  readonly drop: number | null;
  readonly water: number | null;
  readonly short: boolean;
  readonly layer: number | null;
}

/** The places of the parts with `gap` of air before each and the water `short` or not. */
function placed(parts: StatusParts, gap: number, short: boolean): StatusPlaces & { end: number } {
  let x = parts.start + parts.lanterns;
  let drop: number | null = null;
  let water: number | null = null;
  if (parts.water !== null) {
    drop = x + gap;
    water = drop + parts.drop + STATUS_LINE.iconGap;
    x = water + (short ? parts.water.short : parts.water.full);
  }
  let layer: number | null = null;
  if (parts.layer !== null) {
    layer = x + gap;
    x = layer + parts.layer;
  }
  return { drop, water, short, layer, end: x };
}

/**
 * The left part of the HUD's status line (the lanterns lit, then the water after its drop, then
 * the depth of the layers) laid out to end by `end`, where what is written on its right begins
 * (the prompt, the Council's count). It keeps three letters of air before each part while they
 * fit; where they do not, it squeezes that air, never under a letter; and where even that does not
 * fit, the water keeps its drop and numbers and loses its word. Pure: the HUD measures its texts
 * and puts them where this says.
 */
export function statusLine(parts: StatusParts, end: number): StatusPlaces {
  const gaps = (parts.water === null ? 0 : 1) + (parts.layer === null ? 0 : 1);
  for (const short of [false, true]) {
    const tight = placed(parts, 0, short);
    // The air each gap can have, so the part ends by `end`, as much as three letters.
    const room = gaps === 0 ? STATUS_LINE.gap : Math.floor((end - tight.end) / gaps);
    const gap = Math.min(STATUS_LINE.gap, room);
    if (gap >= STATUS_LINE.minGap) return strip(placed(parts, gap, short));
    // Without water, there is no word to lose: the layers keep a letter of air.
    if (parts.water === null) break;
  }
  return strip(placed(parts, STATUS_LINE.minGap, parts.water !== null));
}

/** The places without where they end. */
const strip = ({ drop, water, short, layer }: StatusPlaces & { end: number }): StatusPlaces => ({
  drop,
  water,
  short,
  layer,
});
