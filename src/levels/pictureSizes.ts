/**
 * The sizes a garden is drawn at, in logical pixels, for the layout checks of the levels
 * (`layoutChecks.ts`): a level is laid out by hand, and these say how much room each piece of its
 * picture takes. They mirror the views (`game/view/paintSprout.ts`, `GardenView.ts`,
 * `LanternSprites.ts`) and the pixel font (`game/picture/pixelFont.ts`), which the levels may not
 * import; `tests/pictureSizes.test.ts` keeps both sides equal.
 */
export const PICTURE_SIZES = {
  /** The radius of a sprout's body, outline included. */
  sproutRadius: 7,
  /** The air between the bottom of a sprout and the top of the line its name is written on. */
  labelGap: 1,
  /** The pixel font at its native size: a monospaced cell, and the measures of a line. */
  glyph: { advance: 6, ascent: 10, capHeight: 7, descent: 2 },
  /** The letters whose tail hangs below the baseline, into the descent of the line. */
  tailedLetters: 'gjpqy',
  /**
   * The box the paper of a lantern fills, from the rounded middle of its vine: the frame is
   * centred there, and its paper leaves a border of empty pixels, wider on the right and the top.
   */
  lantern: { left: -7, top: -7, right: 6, bottom: 8 },
  /** The empty pixels a name keeps around it, so that nothing touches its letters. */
  labelClearance: 1,
} as const;
