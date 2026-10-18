/**
 * The sizes a garden is drawn at, in logical pixels, for the layout checks of the levels
 * (`layoutChecks.ts`): a level is laid out by hand, and these say how much room each piece of its
 * picture takes. They mirror the views (`game/view/paintSprout.ts`, `SproutCrowns.ts`,
 * `GardenView.ts`, `LanternSprites.ts`) and the pixel font (`game/picture/pixelFont.ts`), which
 * the levels may not import; `tests/pictureSizes.test.ts` keeps both sides equal.
 */
export const PICTURE_SIZES = {
  /** The radius a sprout's body is painted with; its name is written under it. */
  sproutRadius: 7,
  /**
   * How far a sprout's painted body reaches from its middle, its dark outline included: round for
   * a plain sprout and a bee, to the corners of its diamond for a flower.
   */
  body: { round: 8, diamond: 9.5 },
  /**
   * The box of what crowns each species, from the sprout's middle: a plain sprout's two leaves and
   * a flower's petals (sprites standing on the top of the body), a bee's two wings (painted over
   * its back). They rise above the body, into the name of a sprout standing above.
   */
  crowns: {
    sprout: { left: -7, top: -11, right: 6, bottom: -2 },
    flower: { left: -5, top: -11, right: 5, bottom: -5 },
    bee: { left: -9.5, top: -9, right: 9.5, bottom: -3 },
  },
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
