import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PICTURE_SIZES } from '../src/levels/pictureSizes';
import { frameRect } from '../src/game/assets/frames';
import { assetEntry } from '../src/game/assets/keys';
import { PIXEL_FONT } from '../src/game/picture/pixelFont';
import { SPROUT_RADIUS } from '../src/game/view/paintSprout';
import { pngPixels } from '../tools/assets/pngColours';

// The layout checks of the levels measure a garden with the sizes the views draw it at, mirrored in
// a pure module so the levels never import the game. These tests keep the two from drifting apart.

describe('the sizes the layout checks measure a garden with', () => {
  it('give a sprout the radius the view paints it with', () => {
    expect(PICTURE_SIZES.sproutRadius).toBe(SPROUT_RADIUS);
  });

  it('give a name the cell, ascent, cap height and descent of the pixel font', () => {
    expect(PICTURE_SIZES.glyph).toEqual({
      advance: PIXEL_FONT.advance,
      ascent: PIXEL_FONT.ascent,
      capHeight: PIXEL_FONT.capHeight,
      descent: PIXEL_FONT.descent,
    });
  });

  it('give a lantern the box its paper fills in the frame the view hangs at the middle of a vine', () => {
    const rect = frameRect('lanternBack');
    const pixel = pngPixels(
      readFileSync(new URL(`../public/${assetEntry('actor.lantern').path}`, import.meta.url)),
    );
    // The sprite is centred on the rounded middle, so its top-left pixel is half a frame before it.
    const [halfWidth, halfHeight] = [rect.width / 2, rect.height / 2];
    const ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        if (pixel(rect.x + x, rect.y + y) === null) continue;
        ink.left = Math.min(ink.left, x - halfWidth);
        ink.top = Math.min(ink.top, y - halfHeight);
        ink.right = Math.max(ink.right, x + 1 - halfWidth);
        ink.bottom = Math.max(ink.bottom, y + 1 - halfHeight);
      }
    }
    expect(PICTURE_SIZES.lantern).toEqual(ink);
  });
});
