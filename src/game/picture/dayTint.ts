import { itemAt } from '@core/shared/itemAt';

/**
 * The hour of the backdrop (plan 06, section 1.5): the sun of the HUD tints it from dawn to the
 * plain day, dusk and night, multiplied over the colour of the season. The present of the day is
 * its last state, at night, so the garden is played at night and the lanterns stand out. Only the
 * backdrop is tinted: the garden never is.
 */

/** The four hours of the day the tint passes through, a third of the day apart. */
export const DAY_TINTS = {
  dawn: 0xffcba9,
  day: 0xffffff,
  dusk: 0xf2ad7d,
  night: 0x4a5270,
} as const;

/** The hours in the order the sun meets them. */
const STOPS = [DAY_TINTS.dawn, DAY_TINTS.day, DAY_TINTS.dusk, DAY_TINTS.night];

/** One 8-bit channel of 0xRRGGBB: 16 for red, 8 for green, 0 for blue. */
const channel = (colour: number, shift: number): number => (colour >> shift) & 0xff;

/** A colour from its channels, each worked out by `each` from its shift. */
const fromChannels = (each: (shift: number) => number): number =>
  (each(16) << 16) | (each(8) << 8) | each(0);

/** `a` moved towards `b` by `amount` (0 is `a`, 1 is `b`), each channel rounded. */
export function mixColours(a: number, b: number, amount: number): number {
  return fromChannels((shift) =>
    Math.round(channel(a, shift) + (channel(b, shift) - channel(a, shift)) * amount),
  );
}

/** `a` multiplied by `b` channel by channel, as a tint multiplies a picture's colours. */
export function multiplyColours(a: number, b: number): number {
  return fromChannels((shift) => Math.round((channel(a, shift) * channel(b, shift)) / 255));
}

/**
 * The tint of the hour where the sun stands, from 0 (dawn) to 1 (night), mixed between the two
 * hours around it. With no sun (before it unlocks) the garden is the present: night.
 */
export function dayTint(fraction: number | null): number {
  if (fraction === null) return DAY_TINTS.night;
  const along = Math.max(0, Math.min(1, fraction)) * (STOPS.length - 1);
  const from = Math.min(Math.floor(along), STOPS.length - 2);
  return mixColours(itemAt(STOPS, from), itemAt(STOPS, from + 1), along - from);
}

/** The tint of a season's backdrop at an hour: its own colour multiplied by the hour's. */
export const backdropTint = (season: number, fraction: number | null): number =>
  multiplyColours(season, dayTint(fraction));
