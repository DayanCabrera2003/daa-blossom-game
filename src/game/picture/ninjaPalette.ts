/**
 * The 53 colours of the Ninja Adventure pack's `Palette.png` (plan 06, section 1.1), in the
 * sheet's reading order: row by row, left to right, skipping its transparent cells. Every colour
 * the game paints comes from this list, so the packs and the shapes drawn in the engine share one
 * palette; `tests/ninjaPalette.test.ts` checks the list against the committed image.
 */
export const NINJA_PALETTE: readonly number[] = [
  // Warm yellows and creams, up to white.
  0xd78b4a, 0xffad5d, 0xffbc75, 0xd2b37d, 0xf1c471, 0xffcb8d, 0xeecf9b, 0xffe18d, 0xfce2ca,
  0xffffff,
  // Browns and skin tones.
  0x965340, 0x9c6546, 0xa3754e, 0xbd7959, 0xd3865f, 0xc8966b, 0xf2ad7d, 0xffcba9,
  // Reds, oranges and pinks.
  0xd14b34, 0xe46d3a, 0xef914f, 0xff9554, 0xe0394c, 0xcf736d, 0xef9597,
  // Blues and turquoises.
  0x4a5270, 0x2d697b, 0x548789, 0x79b8ce, 0x71ddee, 0x8feff1, 0xb8dce5, 0xf2eaf1,
  // Greens.
  0x56864c, 0x74a334, 0xa8a129, 0xadbc3a,
  // Violets and plums.
  0x3b3643, 0x543c52, 0x8f3e56, 0xa5608b, 0xd3a2c0,
  // Grey-greens.
  0x345a52, 0x5f7160, 0x8d977f, 0xabc2bc,
  // Near-black and the greys and browns of stone and wood.
  0x141b1b, 0x4e484a, 0x695953, 0x816855, 0x90775e, 0x8e7c73, 0xb3957f,
];

const MEMBERS: ReadonlySet<number> = new Set(NINJA_PALETTE);

/** Whether `colour` (0xRRGGBB) is one of the 53. */
export const inNinjaPalette = (colour: number): boolean => MEMBERS.has(colour);
