import { SPROUT_AREA } from '../fields';
import { PICTURE_SIZES } from '../pictureSizes';

/**
 * Where a sprout of the free mode's editor may sit, by hand or laid out (plan 08, phase 11): the
 * width of a level's sprout area, but only the height left between the editor's header (its two
 * lines of text) and its two rows of buttons, with a margin to each. A sprout's crown must end
 * below the header, and its name above the buttons. The header and the rows are the game's
 * (`game/picture/designHeader.ts`, `designToolbar.ts`), which the levels may not import;
 * `tests/editorArea.test.ts` keeps both sides equal.
 */

/** The bottom of the header's second line, and the top of the upper row of buttons. */
export const EDITOR_FRAME = { headerBottom: 24, toolsTop: 243, margin: 2 } as const;

const { crowns, sproutRadius, labelGap, glyph } = PICTURE_SIZES;

/** How far above a sprout's middle its tallest crown reaches. */
const CROWN_RISE = -Math.min(...Object.values(crowns).map((crown) => crown.top));

/** How far below a sprout's middle its name ends, tails included. */
const NAME_DROP = sproutRadius + labelGap + glyph.ascent + glyph.descent;

/** The rectangle, on whole pixels, where the editor's sprouts may sit. */
export const EDITOR_AREA = {
  x0: SPROUT_AREA.x0,
  x1: SPROUT_AREA.x1,
  y0: EDITOR_FRAME.headerBottom + EDITOR_FRAME.margin + CROWN_RISE,
  y1: EDITOR_FRAME.toolsTop - EDITOR_FRAME.margin - NAME_DROP,
} as const;
