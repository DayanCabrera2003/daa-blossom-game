import { describe, expect, it } from 'vitest';
import { DESIGN_HEADER } from '../src/game/picture/designHeader';
import { DESIGN_ROWS } from '../src/game/picture/designToolbar';
import { fontMetrics } from '../src/game/picture/pixelFont';
import { labelBox } from '../src/levels/layoutChecks';
import { PICTURE_SIZES } from '../src/levels/pictureSizes';
import { EDITOR_AREA, EDITOR_FRAME } from '../src/levels/sandbox/editorArea';

// The free mode's editor keeps its sprouts between its header and its rows of buttons, measured in
// a pure module so the levels never import the game. These tests keep the two from drifting apart.

describe("the room the free mode's editor gives its sprouts", () => {
  it("ends its header where the editor's second line of text ends", () => {
    // The header's texts are drawn at the body size, 8.
    expect(EDITOR_FRAME.headerBottom).toBe(DESIGN_HEADER.promptY + fontMetrics(8).fontSize);
  });

  it("starts its buttons where the editor's upper row of them starts", () => {
    expect(EDITOR_FRAME.toolsTop).toBe(DESIGN_ROWS.tools);
  });

  it('keeps the tallest crown under the header and the lowest name over the buttons', () => {
    const tallest = Math.min(...Object.values(PICTURE_SIZES.crowns).map((crown) => crown.top));
    expect(EDITOR_AREA.y0 + tallest).toBeGreaterThanOrEqual(
      EDITOR_FRAME.headerBottom + EDITOR_FRAME.margin,
    );
    const lowest = labelBox({ label: 'gjpqy', x: 240, y: EDITOR_AREA.y1 });
    expect(lowest.bottom).toBeLessThanOrEqual(EDITOR_FRAME.toolsTop - EDITOR_FRAME.margin);
  });
});
