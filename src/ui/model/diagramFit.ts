import type { Size } from './bookLayout';

/**
 * How big a small garden of the Codex is drawn on its page (plan 07, phases 4 and 5): the diagram
 * is a block (its garden, its controls and its message line, kept together) that must be seen
 * whole. The garden takes one logical pixel per unit of its picture at most, never more than the
 * page's width, and shrinks until the whole block is seen at once when the page opens, below the
 * text above it. When that text leaves too little, the garden is sized to the whole page instead:
 * the reader scrolls a little and then sees the whole block. It never shrinks below the smallest
 * garden still read. The page measures itself and the controls; this only decides.
 */

/** The smallest height a garden is drawn at, in logical pixels: its sprouts and names still read. */
export const MIN_GARDEN_HEIGHT = 96;

/** What the page and the block measure, all in the same unit (screen pixels in the book). */
export interface DiagramRoom {
  /** The room of the text of the page, inside its padding. */
  readonly page: Size;
  /** How far down the text of the page the block starts. */
  readonly top: number;
  /** The height of the block besides its garden: title, controls, message lines and the gaps. */
  readonly kept: number;
  /** The garden's own picture, in its units (logical pixels). */
  readonly picture: Size;
  /** How many units of `page` one logical pixel is: the zoom. */
  readonly unit: number;
  /** Gardens side by side (two for the cut of C8), sharing the width. */
  readonly columns: 1 | 2;
  /** Between two gardens side by side. */
  readonly gap: number;
}

/** The size each garden is drawn at, and whether the whole block is seen as the page opens. */
export interface GardenFit extends Size {
  readonly atOpen: boolean;
}

/** The size each garden of a block takes on its page. */
export function gardenFit(room: DiagramRoom): GardenFit {
  const { page, top, kept, picture, unit, columns, gap } = room;
  const widest = Math.min((page.width - gap * (columns - 1)) / columns, picture.width * unit);
  if (picture.height <= 0) return { width: Math.floor(widest), height: 0, atOpen: true };
  const ratio = picture.width / picture.height;
  /** The garden `height` tall, no wider than it may be. */
  const sized = (height: number, atOpen: boolean): GardenFit => {
    const width = Math.floor(Math.min(widest, height * ratio));
    return { width, height: Math.floor(width / ratio), atOpen };
  };
  const opening = page.height - top - kept;
  const smallest = MIN_GARDEN_HEIGHT * unit;
  if (widest / ratio <= opening || opening >= smallest) return sized(opening, true);
  return sized(Math.max(smallest, page.height - kept), false);
}
