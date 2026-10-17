import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import { SPROUT_HIT_RADIUS } from '../input/HitTest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { BACKDROP, backdropPicture, seedOf, siteOf, type BackdropSite } from './backdrop';
import { boxesOverlap, distanceToPoint, distanceToSegment, type Rect } from './boxDistance';
import { seasonOf } from './seasons';

/** How close an ornament may come to a sprout's touch circle or to a vine, in pixels. */
const CLEAR = 12;

const LEVELS = catalog();

/** The box an ornament covers on the canvas. */
const boxOf = ({
  ornament,
  x,
  y,
}: {
  ornament: { width: number; height: number };
  x: number;
  y: number;
}): Rect => ({
  x,
  y,
  width: ornament.width,
  height: ornament.height,
});

/** A small garden: a triangle of sprouts in the middle of the canvas. */
const TRIANGLE: BackdropSite = {
  id: '1.3',
  sprouts: [
    { x: 200, y: 100 },
    { x: 280, y: 100 },
    { x: 240, y: 170 },
  ],
  vines: [
    [
      { x: 200, y: 100 },
      { x: 280, y: 100 },
    ],
    [
      { x: 280, y: 100 },
      { x: 240, y: 170 },
    ],
  ],
};

describe('the backdrop of a level (plan 06, phase 4)', () => {
  it('seeds its choices from the level id, the same for the same id', () => {
    expect(seedOf('3.1')).toBe(seedOf('3.1'));
    expect(seedOf('3.1')).not.toBe(seedOf('3.2'));
    expect(seedOf('4.10')).not.toBe(seedOf('4.1'));
  });

  it('is always the same for the same level', () => {
    expect(backdropPicture(TRIANGLE)).toEqual(backdropPicture(TRIANGLE));
    const level = LEVELS.find(({ data }) => data.id === '5.2');
    expect(level).toBeDefined();
    if (level !== undefined) {
      expect(backdropPicture(siteOf(level))).toEqual(backdropPicture(siteOf(level)));
    }
  });

  it('tiles the whole canvas with the ground of its chapter', () => {
    const picture = backdropPicture(TRIANGLE);
    expect(picture.season).toBe(seasonOf('1'));
    expect(picture.tiles).toHaveLength(BACKDROP.cols * BACKDROP.rows);
    expect(BACKDROP.cols * 16).toBeGreaterThanOrEqual(CANVAS_WIDTH);
    expect(BACKDROP.rows * 16).toBeGreaterThanOrEqual(CANVAS_HEIGHT);
    const ground = [...picture.season.ground.block.flat(), ...picture.season.ground.sprinkles];
    for (const tile of picture.tiles) expect(ground).toContainEqual(tile);
    // Mostly plain, with some tufts.
    const plain = picture.tiles.filter((tile) => tile === picture.season.ground.block[0]?.[0]);
    expect(plain.length).toBeGreaterThan(picture.tiles.length / 2);
    expect(plain.length).toBeLessThan(picture.tiles.length);
  });

  it('repeats a patterned ground, like the floor of the greenhouse, cell by cell', () => {
    const picture = backdropPicture({ ...TRIANGLE, id: '3.4' });
    const { block } = picture.season.ground;
    expect(picture.tiles[0]).toBe(block[0]?.[0]);
    expect(picture.tiles[1]).toBe(block[0]?.[1]);
    expect(picture.tiles[3]).toBe(block[0]?.[0]);
    expect(picture.tiles[BACKDROP.cols]).toBe(block[1]?.[0]);
  });

  it('sets ornaments down apart from each other, at least half of each on the canvas', () => {
    const picture = backdropPicture(TRIANGLE);
    expect(picture.ornaments.length).toBeGreaterThan(0);
    expect(picture.ornaments.length).toBeLessThanOrEqual(picture.season.ornamentCount);
    picture.ornaments.forEach((placed, i) => {
      const box = boxOf(placed);
      expect(box.x + box.width / 2).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width / 2).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(box.y + box.height / 2).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height / 2).toBeLessThanOrEqual(CANVAS_HEIGHT);
      for (const other of picture.ornaments.slice(i + 1)) {
        expect(boxesOverlap(box, boxOf(other), 0)).toBe(false);
      }
    });
  });

  it('keeps every ornament clear of the sprouts and vines in every level of the catalog', () => {
    expect(LEVELS.length).toBeGreaterThan(40);
    for (const level of LEVELS) {
      const site = siteOf(level);
      expect(site.sprouts).toHaveLength(level.data.sprouts.length);
      expect(site.vines).toHaveLength(level.graph.edges.length);
      for (const placed of backdropPicture(site).ornaments) {
        const box = boxOf(placed);
        for (const sprout of site.sprouts) {
          expect(distanceToPoint(box, sprout)).toBeGreaterThanOrEqual(SPROUT_HIT_RADIUS + CLEAR);
        }
        for (const [a, b] of site.vines) {
          expect(distanceToSegment(box, a, b)).toBeGreaterThanOrEqual(CLEAR);
        }
      }
    }
  });

  it('finds room for some ornaments in most levels', () => {
    const decorated = LEVELS.filter((level) => backdropPicture(siteOf(level)).ornaments.length > 0);
    expect(decorated.length).toBeGreaterThan(LEVELS.length * 0.8);
  });
});
