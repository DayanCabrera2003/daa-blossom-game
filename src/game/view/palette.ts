/**
 * Greybox colours (GDD §4.1): a sprout in the dark reads cold and dim, a lit one warm and bright,
 * so the difference survives in greyscale. Replaced by the real palette at the art phase.
 */
export const PALETTE = {
  background: 0x1d2433,
  fog: 0x0b0f17,
  fogClear: 0x2b3446,
  dark: 0x4a6fa5,
  darkVine: 0x6c7a93,
  lit: 0xf2a541,
  litGlow: 0xffd27a,
  label: 0xe8e6e3,
  sun: 0xffd23f,
  moon: 0x8fb8ff,
  flower: 0xe58fb4,
  oddGroup: 0xb48fe5,
  stone: 0x8a8a8a,
  scarecrow: 0xc9a66b,
  selected: 0xffffff,
  highlight: 0xfff27a,
  chainGain: 0xf2a541,
  chainNone: 0x9aa3b2,
  chainWrong: 0xe5735a,
  panel: 0x2e2a24,
  panelEdge: 0x7a6a52,
  button: 0x4b4136,
  buttonActive: 0x8a6a3a,
  buttonOff: 0x3a3631,
} as const;

/** A colour as the CSS string Phaser text styles expect. */
export const css = (colour: number): string => `#${colour.toString(16).padStart(6, '0')}`;
