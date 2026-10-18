import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import { HUB } from './hubLayout';
import {
  AUTUMN_TREE,
  CABIN,
  chapterOfLevel,
  CHERRY,
  cutOf,
  LILY_POND,
  OAKS,
  ornament,
  seasonOf,
  SOIL_PATCH,
  still,
  type Ornament,
} from './seasons';

/**
 * The hub that grows (plan 06, section 1.5): on the ground of the orchard, each finished chapter
 * plants its piece: 0 its plots and sunflowers, 1 a cherry tree and flowers, 2 the pond, 3 a glass
 * greenhouse, 4 the banners, 5 the autumn tree, 6 the snowy cabin, 7 the oaks. Each chapter's title
 * hangs from a signpost. Pure: the scene measures its signs, titles and buttons, and this says where
 * the pieces go so that none of them covers what the player reads or presses.
 */

/** The signpost before each chapter title, and the room it leaves before the title. */
export const HUB_SIGN = { width: 16, gap: 2 } as const;

/** The hub under the orchard's own warm light (it has no sun to follow). */
export const HUB_TINT = seasonOf('0').tint;

/** Between a piece and what it must not cover, and between two pieces. */
const PIECE_GAP = 2;

/**
 * The piece each chapter plants, by chapter number. None is taller than the bed (48 px), and side
 * by side they fill its width.
 */
export const HUB_PIECES: readonly Ornament[] = [
  SOIL_PATCH,
  CHERRY,
  LILY_POND,
  ornament([{ ...still(cutOf('greenhouseHouse')), glass: 0x8feff1, alpha: 0.6 }]),
  ornament([0, 1, 2].map((k) => still(cutOf('bunting', k, 0, 1, 2), 16 * k, 0))),
  AUTUMN_TREE,
  CABIN,
  OAKS,
];

/** A piece of the hub's garden, planted by `chapter`, with its top-left corner at `x`, `y`. */
export interface HubPlanting {
  readonly chapter: string;
  readonly ornament: Ornament;
  readonly x: number;
  readonly y: number;
}

/** Where a chapter's signpost stands: at the margin, centred on the line of its title. */
export function signBox(titleY: number, lineHeight: number): Rect {
  return {
    x: HUB.margin,
    y: titleY + Math.round((lineHeight - HUB_SIGN.width) / 2),
    width: HUB_SIGN.width,
    height: HUB_SIGN.width,
  };
}

/**
 * The chapters whose every level (drafts aside) is done; a chapter of drafts only never is.
 */
export function finishedChapters(
  levels: readonly { readonly id: string; readonly draft?: boolean }[],
  done: (id: string) => boolean,
): Set<string> {
  const byChapter = new Map<string, boolean>();
  for (const { id, draft } of levels) {
    if (draft === true) continue;
    const chapter = chapterOfLevel(id);
    byChapter.set(chapter, (byChapter.get(chapter) ?? true) && done(id));
  }
  return new Set([...byChapter].filter(([, finished]) => finished).map(([chapter]) => chapter));
}

/**
 * The free place furthest left in the bed along the bottom of the canvas for a `width` × `height`
 * piece, given what is taken already: the places worth trying are at the margin or just right of a
 * box. Null when there is none.
 */
function freePlace(width: number, height: number, taken: readonly Rect[]): Rect | null {
  const y = CANVAS_HEIGHT - height;
  const places = [HUB.margin, ...taken.map((box) => box.x + box.width + PIECE_GAP)]
    .map((x) => ({ x, y, width, height }))
    .filter(
      (place) =>
        place.x + width <= CANVAS_WIDTH - HUB.margin &&
        taken.every((box) => !boxesOverlap(place, box, PIECE_GAP)),
    )
    .sort((a, b) => a.x - b.x);
  return places[0] ?? null;
}

/**
 * The hub's garden for the chapters finished, clear of the boxes in `taken` (signs, titles,
 * buttons). Every chapter's place is worked out in chapter order whether it is finished or not, so
 * a piece stays where it was as the garden grows; a piece with no room left is left out.
 */
export function hubGarden(finished: ReadonlySet<string>, taken: readonly Rect[]): HubPlanting[] {
  const boxes = [...taken];
  const garden: HubPlanting[] = [];
  HUB_PIECES.forEach((piece, chapter) => {
    const place = freePlace(piece.width, piece.height, boxes);
    if (place === null) return;
    boxes.push(place);
    if (finished.has(String(chapter))) {
      garden.push({ chapter: String(chapter), ornament: piece, x: place.x, y: place.y });
    }
  });
  return garden;
}
