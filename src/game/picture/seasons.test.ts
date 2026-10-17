import { describe, expect, it } from 'vitest';
import { frameRect } from '../assets/frames';
import { assetEntry } from '../assets/keys';
import { NAMED_CHAPTERS } from './chapterTitle';
import { chapterOfLevel, cutOf, SEASONS, seasonOf, type Season, type SheetCut } from './seasons';

/** Every cut a season draws: its ground, its ornaments and its drifting particles. */
const cutsOf = (season: Season): SheetCut[] => {
  const { drift } = season;
  return [
    ...season.ground.block.flat(),
    ...season.ground.sprinkles,
    ...season.ornaments.flatMap((ornament) =>
      ornament.parts.flatMap(({ cut, frames }) =>
        // An animated part lays its frames side by side, each as wide as the first.
        Array.from({ length: frames }, (_, k) => ({ ...cut, x: cut.x + k * cut.width })),
      ),
    ),
    ...(drift === null
      ? []
      : Array.from({ length: drift.frames }, (_, k) => ({
          sheet: drift.image,
          x: k * drift.width,
          y: 0,
          width: drift.width,
          height: drift.height,
        }))),
  ];
};

describe('the season of each chapter (plan 06, section 1.5)', () => {
  it('cuts cells out of a named frame, counted from its top-left cell', () => {
    // The fence spans columns 8–14 and rows 4–6 of TilesetHouse; its run of pickets is 10–12, 5.
    expect(cutOf('fence', 2, 1, 3, 1)).toEqual({
      sheet: 'tiles.house',
      x: 160,
      y: 80,
      width: 48,
      height: 16,
    });
    // With no cells named, the whole frame.
    expect(cutOf('cherryTree')).toEqual({ sheet: 'tiles.nature', ...frameRect('cherryTree') });
    // A cut that leaves its frame is a mistake in the table, caught at once.
    expect(() => cutOf('daisy', 1, 0)).toThrow(/daisy/);
  });

  it('reads the chapter of a level from its id', () => {
    expect(chapterOfLevel('4.11')).toBe('4');
    expect(chapterOfLevel('0.1')).toBe('0');
  });

  it('gives every named chapter a season of its own, and a draft chapter the meadow', () => {
    const ids = NAMED_CHAPTERS.map((chapter) => seasonOf(chapter).id);
    expect(new Set(ids).size).toBe(NAMED_CHAPTERS.length);
    expect(seasonOf('9')).toBe(seasonOf('1'));
  });

  it('tints each backdrop with the colour of its season; the meadow is left as it is', () => {
    expect(seasonOf('0').tint).toBe(0xffcba9);
    expect(seasonOf('1').tint).toBe(0xffffff);
    expect(seasonOf('2').tint).toBe(0xb8dce5);
    expect(seasonOf('3').tint).toBe(0x8feff1);
    expect(seasonOf('4').tint).toBe(0xffbc75);
    expect(seasonOf('5').tint).toBe(0xf2ad7d);
    expect(seasonOf('6').tint).toBe(0xb8dce5);
    expect(seasonOf('7').tint).toBe(0xa5608b);
  });

  it('lets leaves fall in the wild garden and snow in the recipe book, and nothing elsewhere', () => {
    expect(seasonOf('5').drift?.image).toBe('fx.leaf');
    expect(seasonOf('6').drift?.image).toBe('fx.snow');
    for (const chapter of ['0', '1', '2', '3', '4', '7'])
      expect(seasonOf(chapter).drift).toBe(null);
  });

  it('puts the three great oaks in the council and the cabin with its candle in the snow', () => {
    const council = seasonOf('7');
    expect(council.ornaments.map(({ parts }) => parts[0]?.cut)).toEqual([cutOf('councilOak')]);
    expect(council.ornamentCount).toBe(3);
    const cabin = seasonOf('6').ornaments.find(({ glow }) => glow !== null);
    expect(cabin?.parts[0]?.cut).toEqual(cutOf('cabin'));
  });

  it('only draws pieces that lie inside sheets the manifest has', () => {
    for (const season of SEASONS) {
      for (const cut of cutsOf(season)) {
        const image = assetEntry(cut.sheet).image ?? { width: 0, height: 0 };
        expect(cut.x >= 0 && cut.y >= 0).toBe(true);
        expect(cut.x + cut.width).toBeLessThanOrEqual(image.width);
        expect(cut.y + cut.height).toBeLessThanOrEqual(image.height);
      }
    }
  });

  it('lays ground tiles of one cell, and ornaments whose parts stay inside them', () => {
    for (const season of SEASONS) {
      const tiles = [...season.ground.block.flat(), ...season.ground.sprinkles];
      for (const tile of tiles) expect([tile.width, tile.height]).toEqual([16, 16]);
      expect(season.ornaments.length).toBeGreaterThan(0);
      for (const { width, height, parts } of season.ornaments) {
        for (const { cut, dx, dy } of parts) {
          expect(dx >= 0 && dy >= 0).toBe(true);
          expect(dx + cut.width).toBeLessThanOrEqual(width);
          expect(dy + cut.height).toBeLessThanOrEqual(height);
        }
      }
    }
  });
});
