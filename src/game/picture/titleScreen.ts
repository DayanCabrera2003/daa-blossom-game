import { CANVAS_HEIGHT } from '../scale/integerZoom';

/**
 * Where the title screen writes its two lines (GDD §6): the game's name large, a little above the
 * middle of the canvas, and under it the invitation to touch, still: a text that faded would stop
 * reading on the grass (`picture/textContrast.ts`). Both are centred across the canvas, on the
 * hub's grass. Pure: the scene writes the texts with their middles at these heights.
 */
export const TITLE_SCREEN = {
  /** The size the name is asked at: three times the font's native size. */
  titleSize: 24,
  /** The middle of the name's line. */
  titleY: Math.round(CANVAS_HEIGHT * 0.4),
  /** The size of the invitation: body text. */
  promptSize: 8,
  /** The middle of the invitation's line. */
  promptY: Math.round(CANVAS_HEIGHT * 0.62),
} as const;
