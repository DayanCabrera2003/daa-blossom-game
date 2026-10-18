import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FRAMES, frameRect, type FrameName } from '../src/game/assets/frames';
import { assetEntry, type AssetKey } from '../src/game/assets/keys';
import { pngPixels } from '../tools/assets/pngColours';

// The named frames of the hub's cosmetics (plan 08, phase 6), checked against the committed PNGs:
// every cell a name covers holds a picture, and between them the names cover each sheet whole, so
// the hub never draws an empty cell nor misses a frame of a walk, a hop or a wingbeat.

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

/** The frames each sheet of the cosmetics is cut into, by sheet. */
const CUTS: Readonly<Record<string, readonly FrameName[]>> = {
  'critter.butterfly': ['butterflyDown', 'butterflyUp', 'butterflyLeft', 'butterflyRight'],
  'critter.butterflyBlue': [
    'butterflyBlueDown',
    'butterflyBlueUp',
    'butterflyBlueLeft',
    'butterflyBlueRight',
  ],
  'critter.frog': ['frogStill', 'frogHop'],
  'critter.cat': ['catStill', 'catWalk'],
  'critter.chickenWhite': ['chickenWhiteStill', 'chickenWhiteWalk'],
  'critter.chickenBrown': ['chickenBrownStill', 'chickenBrownWalk'],
  'deco.plant': ['plantSway'],
};

/** Whether the cell of `size` at (`x`, `y`) of the image read by `pixel` has an opaque pixel. */
function drawn(
  pixel: (x: number, y: number) => number | null,
  x: number,
  y: number,
  size: { readonly width: number; readonly height: number },
): boolean {
  for (let dy = 0; dy < size.height; dy++) {
    for (let dx = 0; dx < size.width; dx++) if (pixel(x + dx, y + dy) !== null) return true;
  }
  return false;
}

describe('the named frames of the hub cosmetics', () => {
  it.each(Object.entries(CUTS))('%s is cut whole into its named frames', (sheet, names) => {
    const entry = assetEntry(sheet as AssetKey);
    const { image, frame: size } = entry;
    expect(image).toBeDefined();
    expect(size).toBeDefined();
    if (image === undefined || size === undefined) return;
    const pixel = pngPixels(new Uint8Array(readFileSync(join(PUBLIC, entry.path))));
    const covered = new Set<string>();
    for (const name of names) {
      expect(FRAMES[name].sheet).toBe(sheet);
      const rect = frameRect(name);
      for (let y = rect.y; y < rect.y + rect.height; y += size.height) {
        for (let x = rect.x; x < rect.x + rect.width; x += size.width) {
          expect(drawn(pixel, x, y, size), `${name} at ${x}, ${y}`).toBe(true);
          const cell = `${x},${y}`;
          expect(covered.has(cell), `${cell} named twice`).toBe(false);
          covered.add(cell);
        }
      }
    }
    expect(covered.size).toBe((image.width / size.width) * (image.height / size.height));
  });

  it('a butterfly beats its wings in four frames in each of its four directions', () => {
    for (const name of CUTS['critter.butterfly'] ?? []) {
      expect(FRAMES[name]).toMatchObject({ cols: 1, rows: 4 });
    }
  });
});
