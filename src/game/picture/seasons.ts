import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import { FRAMES, frameRect, type FrameName } from '../assets/frames';
import type { AssetKey } from '../assets/keys';

/**
 * The season of each chapter (plan 06, section 1.5): the ground its backdrop is tiled with, the
 * ornaments scattered where no sprout or vine is, what drifts across it, and the colour it is
 * tinted with. Pure data written from the table of the plan; `backdrop.ts` lays it out for a level
 * and `hubGarden.ts` plants the hub with the same pieces.
 */

/** A rectangle of a loaded sheet to draw, in pixels inside that sheet. */
export interface SheetCut {
  readonly sheet: AssetKey;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The size of a tile of every tileset: the backdrop is laid on a grid of these. */
export const TILE = 16;

/**
 * Cells of a named frame, counted from its top-left cell: `cols` × `rows` of them from (`col`,
 * `row`); with no size, the rest of the frame from there. A cut that leaves its frame is a mistake
 * in the tables below, so it fails at once with the frame's name.
 */
export function cutOf(name: FrameName, col = 0, row = 0, cols?: number, rows?: number): SheetCut {
  const frame = FRAMES[name];
  const wide = cols ?? frame.cols - col;
  const tall = rows ?? frame.rows - row;
  invariant(
    col >= 0 && row >= 0 && wide > 0 && tall > 0,
    `the cut of ${name} at ${col},${row} is empty`,
  );
  invariant(
    col + wide <= frame.cols && row + tall <= frame.rows,
    `the cut of ${name} at ${col},${row} leaves its frame`,
  );
  const rect = frameRect(name);
  const cellWidth = rect.width / frame.cols;
  const cellHeight = rect.height / frame.rows;
  return {
    sheet: frame.sheet,
    x: rect.x + col * cellWidth,
    y: rect.y + row * cellHeight,
    width: wide * cellWidth,
    height: tall * cellHeight,
  };
}

/** The first frame of a 16 × 16 animation laid out in a strip (the flags, the water ripples). */
const stripStart = (sheet: AssetKey): SheetCut => ({
  sheet,
  x: 0,
  y: 0,
  width: TILE,
  height: TILE,
});

/**
 * One piece of an ornament, `dx`, `dy` from its top-left corner. An animated piece has `frames`
 * frames side by side in its sheet, each as wide as `cut`; a still one has 1. `tint` recolours the
 * piece on top of the backdrop's own tint (the turquoise glass of the hub's greenhouse), and
 * `alpha` lets the backdrop show through it.
 */
export interface OrnamentPart {
  readonly cut: SheetCut;
  readonly dx: number;
  readonly dy: number;
  readonly frames: number;
  readonly tint: number;
  readonly alpha: number;
}

/**
 * Something set down on the ground: a tree, a pond, a fence, a cabin. `glow` is a light of its own
 * (the candle of the cabin), drawn untinted so it shines at night; null for most.
 */
export interface Ornament {
  readonly width: number;
  readonly height: number;
  readonly parts: readonly OrnamentPart[];
  readonly glow: { readonly x: number; readonly y: number; readonly radius: number } | null;
}

/**
 * The ground: a block of tiles repeated over the canvas (one plain tile for grass and snow, the
 * pattern of the greenhouse floor), with a few tiles here and there swapped for a sprinkle (tufts
 * of grass), chosen by the seed of the level.
 */
export interface Ground {
  readonly block: readonly (readonly SheetCut[])[];
  readonly sprinkles: readonly SheetCut[];
  /** The share of tiles swapped for a sprinkle, from 0 to 1. */
  readonly sprinkleChance: number;
}

/** Particles that drift across the backdrop (leaves, snow): one strip of frames in an image. */
export interface Drift {
  readonly image: AssetKey;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  /** How many are in the air at once. */
  readonly count: number;
}

/** The look of a chapter's backdrop. */
export interface Season {
  readonly id:
    'orchard' | 'meadow' | 'pond' | 'greenhouse' | 'festival' | 'wild' | 'recipes' | 'council';
  readonly ground: Ground;
  /** The ornaments a level may get, each as likely as the others. */
  readonly ornaments: readonly Ornament[];
  /** How many ornaments a level tries to set down; fewer when its garden leaves no room. */
  readonly ornamentCount: number;
  readonly drift: Drift | null;
  /** The colour the backdrop is multiplied by (0xffffff leaves it as it is). */
  readonly tint: number;
}

/** A still piece, as it is in its sheet. */
const still = (cut: SheetCut, dx = 0, dy = 0): OrnamentPart => ({
  cut,
  dx,
  dy,
  frames: 1,
  tint: 0xffffff,
  alpha: 1,
});

/** An ornament of the given pieces, as large as the box around them. */
export function ornament(parts: readonly OrnamentPart[], glow: Ornament['glow'] = null): Ornament {
  return {
    width: Math.max(...parts.map(({ cut, dx }) => dx + cut.width)),
    height: Math.max(...parts.map(({ cut, dy }) => dy + cut.height)),
    parts,
    glow,
  };
}

/** A ground of one plain tile, the first of a strip, with the rest of the strip as sprinkles. */
function stripGround(name: FrameName): Ground {
  const variants = Array.from({ length: FRAMES[name].cols }, (_, col) => cutOf(name, col, 0, 1, 1));
  return { block: [variants.slice(0, 1)], sprinkles: variants.slice(1), sprinkleChance: 0.12 };
}

/** The cells of `name` one by one, each its own ornament (the berry bushes, the banners). */
const eachCell = (name: FrameName, cols: number, rows: number, tall = 1): Ornament[] =>
  Array.from({ length: cols * rows }, (_, k) =>
    ornament([still(cutOf(name, k % cols, Math.floor(k / cols) * tall, 1, tall))]),
  );

/** The fallen-in square of soil of the orchard, with a sunflower at its side. */
export const SOIL_PATCH = ornament([
  still(cutOf('soilPlots', 0, 0, 3, 3)),
  still(cutOf('sunflowers', 0, 0, 1, 1), 48, 16),
]);
/** A round pond on the grass, with a lily pad on the water. */
export const LILY_POND = ornament([
  still(cutOf('shore', 0, 0, 3, 3)),
  still(cutOf('lilyPad'), 16, 16),
]);
/** The cabin of the recipe book, a candle lit in its window. */
export const CABIN = ornament([still(cutOf('cabin'))], { x: 24, y: 40, radius: 7 });
/** The three great oaks of the council. */
export const OAKS = ornament([still(cutOf('councilOak'))]);
/** The cherry tree of the meadow. */
export const CHERRY = ornament([still(cutOf('cherryTree'))]);
/** The autumn tree of the wild garden. */
export const AUTUMN_TREE = ornament([still(cutOf('autumnTree'))]);

/** A pond whose water ripples. */
const RIPPLE_POND = ornament([
  still(cutOf('shore', 0, 0, 3, 3)),
  { ...still(stripStart('anim.waterRipples'), 16, 16), frames: 4 },
]);

/** A festival flag of each colour, waving. */
const FLAGS: AssetKey[] = ['anim.flagRed', 'anim.flagYellow', 'anim.flagBlue', 'anim.flagGreen'];

const GRASS = stripGround('grassLight');
const DARK_GRASS = stripGround('grassDark');

/** The seasons of the chapters 0 to 7, in that order. */
export const SEASONS: readonly Season[] = [
  {
    id: 'orchard',
    ground: GRASS,
    ornaments: [
      SOIL_PATCH,
      ornament([still(cutOf('sunflowers'))]),
      ornament([still(cutOf('fence', 2, 1, 3, 1))]),
    ],
    ornamentCount: 6,
    drift: null,
    tint: 0xffcba9,
  },
  {
    id: 'meadow',
    ground: GRASS,
    ornaments: [CHERRY, ornament([still(cutOf('daisy'))]), ornament([still(cutOf('redFlower'))])],
    ornamentCount: 8,
    drift: null,
    tint: 0xffffff,
  },
  {
    id: 'pond',
    ground: GRASS,
    ornaments: [LILY_POND, RIPPLE_POND],
    ornamentCount: 4,
    drift: null,
    tint: 0xb8dce5,
  },
  {
    id: 'greenhouse',
    ground: {
      block: [0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => cutOf('greenhouseFloor', col, row, 1, 1)),
      ),
      sprinkles: [],
      sprinkleChance: 0,
    },
    ornaments: [ornament([still(cutOf('beehive'))]), ...eachCell('berryBushes', 3, 2)],
    ornamentCount: 6,
    drift: null,
    tint: 0x8feff1,
  },
  {
    id: 'festival',
    ground: DARK_GRASS,
    ornaments: [
      ...eachCell('bunting', 7, 1, 2),
      ...FLAGS.map((flag) => ornament([{ ...still(stripStart(flag)), frames: 4 }])),
      // The red paper lanterns: the lantern's back, as it is in its sheet.
      ornament([still(cutOf('lanternBack'))]),
    ],
    ornamentCount: 8,
    drift: null,
    tint: 0xffbc75,
  },
  {
    id: 'wild',
    ground: stripGround('soilBrown'),
    ornaments: [
      AUTUMN_TREE,
      ornament([still(cutOf('deadTrees'))]),
      ornament([still(cutOf('mushrooms'))]),
    ],
    ornamentCount: 6,
    drift: { image: 'fx.leaf', width: 12, height: 7, frames: 6, count: 8 },
    tint: 0xf2ad7d,
  },
  {
    id: 'recipes',
    ground: stripGround('snow'),
    ornaments: [CABIN, ornament([still(cutOf('snowyPines'))])],
    ornamentCount: 4,
    drift: { image: 'fx.snow', width: 8, height: 8, frames: 7, count: 14 },
    tint: 0xb8dce5,
  },
  {
    id: 'council',
    ground: DARK_GRASS,
    ornaments: [OAKS],
    ornamentCount: 3,
    drift: null,
    tint: 0xa5608b,
  },
];

/** The chapter a level belongs to: the part of its id before the dot ("4" of "4.11"). */
export const chapterOfLevel = (levelId: string): string => levelId.split('.')[0] ?? levelId;

/** The season of a chapter; a chapter with no name yet (drafts) is a plain meadow. */
export function seasonOf(chapter: string): Season {
  return SEASONS[Number(chapter)] ?? itemAt(SEASONS, 1);
}
