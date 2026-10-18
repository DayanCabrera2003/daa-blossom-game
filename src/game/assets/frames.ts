import { invariant } from '@core/shared/invariant';
import { assetEntry, type AssetKey } from './keys';

/**
 * A named piece of a sheet: its top-left cell (column, row) and how many cells wide and tall it
 * is, in the sheet's own frame size (16 × 16 for every tileset).
 */
export interface NamedFrame {
  readonly sheet: AssetKey;
  readonly col: number;
  readonly row: number;
  readonly cols: number;
  readonly rows: number;
}

/** A single cell, the most common piece. */
const cell = (sheet: AssetKey, col: number, row: number): NamedFrame => ({
  sheet,
  col,
  row,
  cols: 1,
  rows: 1,
});

/**
 * The pieces the tables of plan 06 (sections 1.3 to 1.6) name, written by hand from those tables.
 * A range "0–4, 12" is columns 0 to 4 of row 12. Phases that need more append them at the end of
 * their section.
 */
export const FRAMES = {
  // 1.3 Portraits: the round tree that becomes the face of the Council, and the three great oaks.
  oakFace: { sheet: 'tiles.nature', col: 6, row: 8, cols: 2, rows: 2 },
  councilOak: { sheet: 'tiles.nature', col: 4, row: 2, cols: 4, rows: 3 },

  // 1.4 Garden pieces.
  sproutLeaves: cell('tiles.floorDetail', 6, 2),
  lanternBack: cell('actor.lantern', 1, 0),
  stoneSmall: cell('tiles.nature', 18, 9),
  scarecrowPost: cell('tiles.element', 6, 4),
  // The first of the two frames of the animated flower: the petals on a chapter 3 flower.
  flowerHead: cell('anim.flower', 0, 0),

  // 1.5 Backdrops by chapter: grounds (one strip of variants each) and decorations.
  grassLight: { sheet: 'tiles.floor', col: 0, row: 12, cols: 5, rows: 1 },
  grassDark: { sheet: 'tiles.floor', col: 11, row: 12, cols: 5, rows: 1 },
  soilPlots: { sheet: 'tiles.floor', col: 0, row: 7, cols: 11, rows: 5 },
  soilBrown: { sheet: 'tiles.floor', col: 11, row: 19, cols: 5, rows: 1 },
  snow: { sheet: 'tiles.floor', col: 0, row: 19, cols: 5, rows: 1 },
  shore: { sheet: 'tiles.water', col: 0, row: 6, cols: 11, rows: 5 },
  greenhouseFloor: { sheet: 'tiles.interiorFloor', col: 11, row: 6, cols: 11, rows: 4 },
  sunflowers: { sheet: 'tiles.nature', col: 0, row: 11, cols: 2, rows: 1 },
  fence: { sheet: 'tiles.house', col: 8, row: 4, cols: 7, rows: 3 },
  cherryTree: { sheet: 'tiles.nature', col: 14, row: 0, cols: 2, rows: 2 },
  daisy: cell('tiles.nature', 3, 11),
  redFlower: cell('tiles.nature', 6, 11),
  lilyPad: cell('tiles.water', 11, 3),
  beehive: cell('kenney.town', 10, 7),
  berryBushes: { sheet: 'tiles.nature', col: 4, row: 14, cols: 3, rows: 4 },
  bunting: { sheet: 'tiles.house', col: 22, row: 20, cols: 7, rows: 2 },
  autumnTree: { sheet: 'tiles.nature', col: 9, row: 18, cols: 3, rows: 3 },
  deadTrees: { sheet: 'tiles.nature', col: 0, row: 5, cols: 4, rows: 3 },
  mushrooms: cell('kenney.town', 5, 2),
  snowyPines: { sheet: 'tiles.nature', col: 8, row: 5, cols: 4, rows: 3 },
  cabin: { sheet: 'tiles.house', col: 25, row: 10, cols: 4, rows: 4 },

  // 1.5 The hub that grows: the greenhouse house and the level signposts.
  greenhouseHouse: { sheet: 'tiles.house', col: 8, row: 0, cols: 4, rows: 3 },
  signpost: cell('kenney.town', 11, 6),

  // 1.6 Round buttons of the Kenney UI pack, where Ninja Adventure has no piece.
  roundButtons: { sheet: 'kenney.ui', col: 0, row: 1, cols: 3, rows: 1 },

  // Plan 08, section 1.2: the cosmetics of the hub. A butterfly's sheet has a column for each
  // direction it faces (down, up, left, right) and a row for each of the four frames of its
  // wingbeat; an animal's, the animal still and then moving; the plant's, the four frames of its
  // sway.
  butterflyDown: { sheet: 'critter.butterfly', col: 0, row: 0, cols: 1, rows: 4 },
  butterflyUp: { sheet: 'critter.butterfly', col: 1, row: 0, cols: 1, rows: 4 },
  butterflyLeft: { sheet: 'critter.butterfly', col: 2, row: 0, cols: 1, rows: 4 },
  butterflyRight: { sheet: 'critter.butterfly', col: 3, row: 0, cols: 1, rows: 4 },
  butterflyBlueDown: { sheet: 'critter.butterflyBlue', col: 0, row: 0, cols: 1, rows: 4 },
  butterflyBlueUp: { sheet: 'critter.butterflyBlue', col: 1, row: 0, cols: 1, rows: 4 },
  butterflyBlueLeft: { sheet: 'critter.butterflyBlue', col: 2, row: 0, cols: 1, rows: 4 },
  butterflyBlueRight: { sheet: 'critter.butterflyBlue', col: 3, row: 0, cols: 1, rows: 4 },
  frogStill: cell('critter.frog', 0, 0),
  frogHop: cell('critter.frog', 1, 0),
  catStill: cell('critter.cat', 0, 0),
  catWalk: cell('critter.cat', 1, 0),
  chickenWhiteStill: cell('critter.chickenWhite', 0, 0),
  chickenWhiteWalk: cell('critter.chickenWhite', 1, 0),
  chickenBrownStill: cell('critter.chickenBrown', 0, 0),
  chickenBrownWalk: cell('critter.chickenBrown', 1, 0),
  plantSway: { sheet: 'deco.plant', col: 0, row: 0, cols: 4, rows: 1 },
} as const satisfies Record<string, NamedFrame>;

export type FrameName = keyof typeof FRAMES;

/** A rectangle in pixels inside its sheet. */
export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where a named frame sits in its sheet, in pixels, from the frame size the manifest records. */
export function frameRect(name: FrameName): PixelRect {
  const frame: NamedFrame | undefined = FRAMES[name];
  invariant(frame !== undefined, `there is no frame named ${name}`);
  const size = assetEntry(frame.sheet).frame;
  invariant(size !== undefined, `${frame.sheet} is not a sheet`);
  return {
    x: frame.col * size.width,
    y: frame.row * size.height,
    width: frame.cols * size.width,
    height: frame.rows * size.height,
  };
}

/**
 * The number Phaser gives a single-cell named frame in its sheet: cells are numbered row by row
 * from the top left (`sheetGrid.ts`), so it is the row times the cells in a row, plus the column.
 * A piece of several cells has no single number and is an error.
 */
export function frameIndex(name: FrameName): number {
  const frame: NamedFrame = FRAMES[name];
  invariant(frame.cols === 1 && frame.rows === 1, `${name} is more than one cell`);
  const { image, frame: size } = assetEntry(frame.sheet);
  invariant(image !== undefined && size !== undefined, `${frame.sheet} is not a sheet`);
  return frame.row * Math.floor(image.width / size.width) + frame.col;
}
