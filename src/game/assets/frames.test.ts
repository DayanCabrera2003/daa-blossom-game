import { describe, expect, it } from 'vitest';
import { FRAMES, frameIndex, frameRect, type FrameName } from './frames';
import { assetEntry } from './keys';

describe('named frames', () => {
  it('cuts each frame out of a sheet', () => {
    for (const frame of Object.values(FRAMES)) {
      expect(assetEntry(frame.sheet).kind).toBe('sheet');
    }
  });

  it('turns tile coordinates into a rectangle in pixels', () => {
    // The two-leaf sprout of TilesetFloorDetail sits at column 6, row 2 of a 16-pixel grid.
    expect(frameRect('sproutLeaves')).toEqual({ x: 96, y: 32, width: 16, height: 16 });
    // The fence spans columns 8–14 and rows 4–6 of TilesetHouse.
    expect(frameRect('fence')).toEqual({ x: 128, y: 64, width: 112, height: 48 });
  });

  it('finds the beehive and the mushrooms where the Tiny Town sheet draws them', () => {
    // Column 9 of row 7 holds a yellow sack and column 4 of row 2 a pine: both sit one cell on.
    expect(frameRect('beehive')).toEqual({ x: 160, y: 112, width: 16, height: 16 });
    expect(frameRect('mushrooms')).toEqual({ x: 80, y: 32, width: 16, height: 16 });
  });

  it('uses the frame size of its sheet', () => {
    expect(frameRect('lanternBack')).toEqual({ x: 16, y: 0, width: 16, height: 16 });
  });

  it('numbers a single cell the way Phaser numbers the frames of its sheet', () => {
    // TilesetFloorDetail is 16 cells wide: row 2, column 6 is frame 2 × 16 + 6.
    expect(frameIndex('sproutLeaves')).toBe(38);
    expect(frameIndex('lanternBack')).toBe(1);
    // The flower's picture is two frames of 10 × 8: the first one is frame 0.
    expect(frameIndex('flowerHead')).toBe(0);
    expect(frameRect('flowerHead')).toEqual({ x: 0, y: 0, width: 10, height: 8 });
  });

  it('refuses a frame number for a piece wider or taller than one cell', () => {
    expect(() => frameIndex('fence')).toThrow(/fence/);
  });

  it('fails loudly on a frame name it does not know', () => {
    expect(() => frameRect('nowhere' as FrameName)).toThrow(/nowhere/);
  });
});
