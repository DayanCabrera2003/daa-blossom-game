import { createRng, type Rng } from '@core/shared/rng';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, distanceToPoint, distanceToSegment, type Rect } from './boxDistance';
import {
  chapterOfLevel,
  seasonOf,
  TILE,
  type Ornament,
  type Season,
  type SheetCut,
} from './seasons';

/**
 * The backdrop of a level (plan 06, phase 4): the 480 × 270 canvas tiled with the ground of its
 * chapter's season (30 × 17 tiles), and ornaments set down only where they stay clear of every
 * sprout and vine. Every choice comes from a generator seeded with the level id, so a level always
 * gets the same backdrop. Composed by code from the tiles rather than drawn in Tiled, so it is
 * checked in tests and moves out of the way of each level's garden by itself.
 */
export const BACKDROP = {
  cols: Math.ceil(CANVAS_WIDTH / TILE),
  rows: Math.ceil(CANVAS_HEIGHT / TILE),
  /** The least clear space between an ornament and a sprout or a vine. */
  clearance: 12,
  /**
   * How far a sprout reaches from its centre: its body, the leaves on top and its name below.
   * Wider than the touch circle, so the clearance holds from all that is drawn of it.
   */
  sproutReach: 16,
  /** Half the width of a lit vine and its glow. */
  vineReach: 2,
  /** The least clear space between two ornaments. */
  ornamentGap: 4,
  /** How many random places are tried for the ornaments of a level. */
  attempts: 80,
  /**
   * How much of the backdrop shows over the canvas background: low, so the garden reads first
   * (GDD §4.1, "legible before pretty").
   */
  alpha: 0.6,
} as const;

/** What of a level the backdrop moves out of the way of: its sprouts and its vines. */
export interface BackdropSite {
  readonly id: string;
  readonly sprouts: readonly Point[];
  readonly vines: readonly (readonly [Point, Point])[];
}

/** An ornament set down with its top-left corner at `x`, `y`. */
export interface PlacedOrnament {
  readonly ornament: Ornament;
  readonly x: number;
  readonly y: number;
}

/** A level's backdrop: its season, the ground tile by tile (row by row), and its ornaments. */
export interface BackdropPicture {
  readonly season: Season;
  readonly tiles: readonly SheetCut[];
  readonly ornaments: readonly PlacedOrnament[];
}

/** The sprouts of a level where its file puts them, and its vines between them. */
export function siteOf(level: Level): BackdropSite {
  const sprouts = level.data.sprouts.map(({ x, y }) => ({ x, y }));
  return {
    id: level.data.id,
    sprouts,
    vines: level.graph.edges.map(([u, v]) => [itemAt(sprouts, u), itemAt(sprouts, v)] as const),
  };
}

/** A 32-bit seed from a level id (FNV-1a), so each level has its own backdrop. */
export function seedOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The box a placed ornament covers on the canvas. */
export const boxOfPlaced = ({ ornament, x, y }: PlacedOrnament): Rect => ({
  x,
  y,
  width: ornament.width,
  height: ornament.height,
});

/** Whether `box` keeps the clearance from every sprout and every vine of the site. */
export function clearOfGarden(box: Rect, site: BackdropSite): boolean {
  const { clearance, sproutReach, vineReach } = BACKDROP;
  return (
    site.sprouts.every((sprout) => distanceToPoint(box, sprout) >= sproutReach + clearance) &&
    site.vines.every(([a, b]) => distanceToSegment(box, a, b) >= vineReach + clearance)
  );
}

/** The ground, tile by tile: the season's block repeated, with sprinkles here and there. */
function groundTiles(season: Season, rng: Rng): SheetCut[] {
  const { block, sprinkles, sprinkleChance } = season.ground;
  const tiles: SheetCut[] = [];
  for (let row = 0; row < BACKDROP.rows; row++) {
    const line = itemAt(block, row % block.length);
    for (let col = 0; col < BACKDROP.cols; col++) {
      const sprinkled = sprinkles.length > 0 && rng.next() < sprinkleChance;
      tiles.push(sprinkled ? rng.pick(sprinkles) : itemAt(line, col % line.length));
    }
  }
  return tiles;
}

/** A ground on its own, with no ornaments: the orchard's grass under the hub. */
export const groundOf = (season: Season, seed: number): SheetCut[] =>
  groundTiles(season, createRng(seed));

/**
 * Tries random places for the season's ornaments, keeping each one that stays clear of the garden
 * and of the ornaments kept before it, until the season has its count or the tries run out. An
 * ornament may hang over an edge of the canvas, but never by more than half of it.
 */
function placeOrnaments(season: Season, site: BackdropSite, rng: Rng): PlacedOrnament[] {
  const placed: PlacedOrnament[] = [];
  for (let k = 0; k < BACKDROP.attempts && placed.length < season.ornamentCount; k++) {
    const ornament = rng.pick(season.ornaments);
    const { width, height } = ornament;
    const x = rng.int(CANVAS_WIDTH + 1) - Math.floor(width / 2);
    const y = rng.int(CANVAS_HEIGHT + 1) - Math.floor(height / 2);
    const box = { x, y, width, height };
    const apart = placed.every(
      (other) => !boxesOverlap(box, boxOfPlaced(other), BACKDROP.ornamentGap),
    );
    if (apart && clearOfGarden(box, site)) placed.push({ ornament, x, y });
  }
  return placed;
}

/** The backdrop of a level: the same for the same level, every time. */
export function backdropPicture(site: BackdropSite): BackdropPicture {
  const season = seasonOf(chapterOfLevel(site.id));
  const rng = createRng(seedOf(site.id));
  const tiles = groundTiles(season, rng);
  return { season, tiles, ornaments: placeOrnaments(season, site, rng) };
}
