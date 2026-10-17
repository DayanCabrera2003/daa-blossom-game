import { describe, expect, it } from 'vitest';
import { FRAMES, frameRect, type FrameName } from './frames';
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

  it('uses the frame size of its sheet', () => {
    expect(frameRect('lanternBack')).toEqual({ x: 16, y: 0, width: 16, height: 16 });
  });

  it('fails loudly on a frame name it does not know', () => {
    expect(() => frameRect('nowhere' as FrameName)).toThrow(/nowhere/);
  });
});
