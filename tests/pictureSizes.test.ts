import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PICTURE_SIZES } from '../src/levels/pictureSizes';
import { frameRect } from '../src/game/assets/frames';
import { assetEntry } from '../src/game/assets/keys';
import { PIXEL_FONT } from '../src/game/picture/pixelFont';
import { BEE_WINGS, diamondReach, OUTLINE, SPROUT_RADIUS } from '../src/game/view/paintSprout';
import { CROWN_ANCHORS } from '../src/game/view/SproutCrowns';
import { pngPixels } from '../tools/assets/pngColours';

/** The box the coloured pixels of a named frame fill, from the point of the frame at `origin`. */
function inkBox(
  name: 'lanternBack' | 'sproutLeaves' | 'flowerHead',
  key: 'actor.lantern' | 'tiles.floorDetail' | 'anim.flower',
  origin: { x: number; y: number },
) {
  const rect = frameRect(name);
  const pixel = pngPixels(
    readFileSync(new URL(`../public/${assetEntry(key).path}`, import.meta.url)),
  );
  const [ox, oy] = [origin.x * rect.width, origin.y * rect.height];
  const ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      if (pixel(rect.x + x, rect.y + y) === null) continue;
      ink.left = Math.min(ink.left, x - ox);
      ink.top = Math.min(ink.top, y - oy);
      ink.right = Math.max(ink.right, x + 1 - ox);
      ink.bottom = Math.max(ink.bottom, y + 1 - oy);
    }
  }
  return ink;
}

/** A box moved `dy` pixels down. */
const lowered = (box: ReturnType<typeof inkBox>, dy: number) => ({
  ...box,
  top: box.top + dy,
  bottom: box.bottom + dy,
});

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
    // The sprite is centred on the rounded middle.
    expect(PICTURE_SIZES.lantern).toEqual(
      inkBox('lanternBack', 'actor.lantern', { x: 0.5, y: 0.5 }),
    );
  });

  it("give a sprout's body the reach of its outline: round, or a flower's diamond", () => {
    expect(PICTURE_SIZES.body).toEqual({
      round: SPROUT_RADIUS + OUTLINE,
      diamond: diamondReach(SPROUT_RADIUS, OUTLINE),
    });
  });

  it("give each species' crown the box its sprite fills where the view places it", () => {
    // Each sprite hangs `sink` pixels below the top of the body, from its anchor.
    const placed = (name: keyof typeof CROWN_ANCHORS, key: Parameters<typeof inkBox>[1]) => {
      const { originY, sink } = CROWN_ANCHORS[name];
      return lowered(inkBox(name, key, { x: 0.5, y: originY }), sink - SPROUT_RADIUS);
    };
    expect(PICTURE_SIZES.crowns.sprout).toEqual(placed('sproutLeaves', 'tiles.floorDetail'));
    expect(PICTURE_SIZES.crowns.flower).toEqual(placed('flowerHead', 'anim.flower'));
  });

  it("give a bee's crown the box its two wings fill", () => {
    const { width, height, inset } = BEE_WINGS;
    const [wx, wy] = [SPROUT_RADIUS - inset, -SPROUT_RADIUS + inset];
    expect(PICTURE_SIZES.crowns.bee).toEqual({
      left: -wx - width / 2,
      top: wy - height / 2,
      right: wx + width / 2,
      bottom: wy + height / 2,
    });
  });
});
