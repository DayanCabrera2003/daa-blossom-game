import { describe, expect, it } from 'vitest';
import { sheetGrid } from './sheetGrid';

describe('sheetGrid', () => {
  it('numbers the frames row by row, as Phaser cuts a sprite sheet', () => {
    expect(sheetGrid({ width: 32, height: 32 }, { width: 16, height: 16 })).toEqual([
      { index: 0, x: 0, y: 0, width: 16, height: 16 },
      { index: 1, x: 16, y: 0, width: 16, height: 16 },
      { index: 2, x: 0, y: 16, width: 16, height: 16 },
      { index: 3, x: 16, y: 16, width: 16, height: 16 },
    ]);
  });

  it('drops a strip too narrow or too short for a whole frame', () => {
    const grid = sheetGrid({ width: 40, height: 20 }, { width: 16, height: 16 });
    expect(grid.map((frame) => [frame.x, frame.y])).toEqual([
      [0, 0],
      [16, 0],
    ]);
  });

  it('cuts the Tiny Town sheet into its 12 × 11 tiles', () => {
    const grid = sheetGrid({ width: 192, height: 176 }, { width: 16, height: 16 });
    expect(grid).toHaveLength(132);
    expect(grid.at(-1)).toEqual({ index: 131, x: 176, y: 160, width: 16, height: 16 });
  });
});
