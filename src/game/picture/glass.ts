/**
 * A piece recoloured to glass (plan 06, section 1.5: the hub's greenhouse is the house of
 * TilesetHouse turned turquoise). Multiplying by a tint cannot turn an orange roof turquoise, so
 * each pixel keeps only its brightness, and takes the colour of the glass at that brightness:
 * white becomes the glass itself, black its darkest shade. What is see-through stays so.
 */

/** How bright the darkest shade of the glass is, from 0 (black) to 1 (the glass itself). */
const DARKEST = 0.4;

/** The pixels (RGBA, row by row) of a picture recoloured to the glass `colour` (0xRRGGBB). */
export function glassPixels(pixels: Uint8ClampedArray, colour: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  const glass = [(colour >> 16) & 0xff, (colour >> 8) & 0xff, colour & 0xff];
  for (let i = 0; i < out.length; i += 4) {
    const [r, g, b] = [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0];
    // The brightness to the eye (ITU-R BT.601), whole, so equally bright colours match exactly.
    const luma = Math.round((299 * r + 587 * g + 114 * b) / 1000) / 255;
    const shade = DARKEST + (1 - DARKEST) * luma;
    glass.forEach((channel, c) => (out[i + c] = Math.round(channel * shade)));
  }
  return out;
}
