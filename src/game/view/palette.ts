/**
 * The colours the engine paints, every one taken from the 53 of the Ninja Adventure palette
 * (plan 06, section 1.1; `picture/ninjaPalette.ts`). A sprout in the dark reads cold and dim, a lit
 * one warm and bright, so the difference survives in greyscale (GDD §4.1); `tests/palette.test.ts`
 * holds them to a minimum contrast.
 */
export const PALETTE = {
  background: 0x141b1b,
  fog: 0x3b3643,
  fogClear: 0x543c52,
  // Bluish, so a sprout in the dark is cold next to the amber of a lit one.
  dark: 0x4a5270,
  darkVine: 0x5f7160,
  // Amber: the lantern, and a chain that gains a lantern.
  lit: 0xef914f,
  litGlow: 0xffe18d,
  label: 0xf2eaf1,
  sun: 0xf1c471,
  moon: 0x79b8ce,
  flower: 0xd3a2c0,
  oddGroup: 0xa5608b,
  stone: 0x8d977f,
  scarecrow: 0xc8966b,
  selected: 0xffffff,
  highlight: 0xfce2ca,
  chainGain: 0xef914f,
  chainNone: 0xabc2bc,
  chainWrong: 0xe0394c,
  mirror: 0xb8dce5,
  water: 0x2d697b,
  // The wood of panels and buttons.
  panel: 0x965340,
  panelEdge: 0x543c52,
  button: 0xbd7959,
  buttonActive: 0xd3865f,
  buttonOff: 0x695953,
  // Dark letters on light wood (the dialogue page, a button at rest), and the moss of the oaks.
  ink: 0x141b1b,
  moss: 0x345a52,
} as const;

/** A colour as the CSS string Phaser text styles expect. */
export const css = (colour: number): string => `#${colour.toString(16).padStart(6, '0')}`;
