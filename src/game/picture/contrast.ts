/**
 * How far apart two colours read, as WCAG 2 measures it: the relative luminance of each (its
 * brightness to the eye, from 0 for black to 1 for white) and their contrast ratio, from 1 (the
 * same colour) to 21 (black on white). The palette test uses it so that a lit lantern still stands
 * out from a dark sprout, and both from the background, when the screen is seen in grey (GDD §4.1).
 */

/** One sRGB channel (0–255) turned into linear light. */
function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** The relative luminance of 0xRRGGBB, from 0 (black) to 1 (white). */
export function relativeLuminance(colour: number): number {
  const r = linear((colour >> 16) & 0xff);
  const g = linear((colour >> 8) & 0xff);
  const b = linear(colour & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of two colours, the same whichever comes first: 1 to 21. */
export function contrast(a: number, b: number): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
