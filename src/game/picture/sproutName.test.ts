import { labelBox } from '@levels/layoutChecks';
import { PICTURE_SIZES } from '@levels/pictureSizes';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../view/palette';
import { contrast } from './contrast';
import { NAME_OUTLINE, outlinedNameBox } from './sproutName';

describe("the outline of a sprout's name", () => {
  it('is drawn a pixel away on every side, the corners included', () => {
    expect(NAME_OUTLINE.offsets).toHaveLength(8);
    const seen = new Set(NAME_OUTLINE.offsets.map(({ x, y }) => `${x},${y}`));
    expect(seen.size).toBe(8);
    for (const { x, y } of NAME_OUTLINE.offsets) {
      expect(Math.max(Math.abs(x), Math.abs(y))).toBe(NAME_OUTLINE.width);
    }
    expect(NAME_OUTLINE.width).toBe(1);
  });

  it('stands out from the letters and from a vine, lit or dark, it is drawn over', () => {
    const outline = PALETTE[NAME_OUTLINE.colour];
    // WCAG's body text against the letters; its large shapes against a vine's strokes.
    expect(contrast(outline, PALETTE.label)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(outline, PALETTE.lit)).toBeGreaterThanOrEqual(3);
    expect(contrast(outline, PALETTE.litGlow)).toBeGreaterThanOrEqual(3);
    expect(contrast(outline, PALETTE.darkVine)).toBeGreaterThanOrEqual(3);
  });

  it("grows the name's box by the outline on every side, inside the names' clearance", () => {
    const sprout = { label: 'gR', x: 100, y: 60 };
    const ink = labelBox(sprout);
    expect(outlinedNameBox(sprout)).toEqual({
      left: ink.left - 1,
      top: ink.top - 1,
      right: ink.right + 1,
      bottom: ink.bottom + 1,
    });
    // The layout checks keep this much empty round every name: the outline fills it, no more.
    expect(NAME_OUTLINE.width).toBeLessThanOrEqual(PICTURE_SIZES.labelClearance);
  });
});
