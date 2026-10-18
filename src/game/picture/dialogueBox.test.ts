import { describe, expect, it } from 'vitest';
import { LAYOUT } from '../view/layout';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { DIALOGUE_ROWS, dialogueBox } from './dialogueBox';
import { PORTRAIT_BOX } from './portrait';
import { LINE_HEIGHT } from './textWrap';
import { WOOD_DIALOGUE } from './wood';

/** Whether rectangle `inner` lies inside `outer`. */
const inside = (
  inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number },
) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

describe('the dialogue box and what is in it', () => {
  const plain = dialogueBox(false);
  const portrayed = dialogueBox(true);

  it('sits over the garden, clear of the toolbar, across the canvas', () => {
    for (const { box } of [plain, portrayed]) {
      expect(box.y + box.height).toBeLessThanOrEqual(LAYOUT.toolbarY - 1);
      expect(box.y).toBeGreaterThanOrEqual(LAYOUT.garden.y);
      expect(box.x + box.width).toBeLessThanOrEqual(CANVAS_WIDTH);
    }
    // The box keeps its place whoever speaks, so it does not jump between two lines.
    expect(portrayed.box).toEqual(plain.box);
  });

  it('writes on the page, inside the border of the wood', () => {
    const { right, top, bottom } = WOOD_DIALOGUE.slices;
    for (const { box, text, hint } of [plain, portrayed]) {
      const page = {
        x: box.x + 6,
        y: box.y + top,
        width: box.width - 6 - right,
        height: box.height - top - bottom,
      };
      expect(inside(text, page)).toBe(true);
      expect(text.height).toBe(DIALOGUE_ROWS * LINE_HEIGHT);
      expect(
        inside({ x: hint.x - 1, y: hint.y - LINE_HEIGHT, width: 1, height: LINE_HEIGHT }, page),
      ).toBe(true);
      // The hint goes under the text, not over it.
      expect(hint.y - LINE_HEIGHT).toBeGreaterThanOrEqual(text.y + text.height);
    }
  });

  it('puts the portrait, in its frame, on the page at the left of the text', () => {
    expect(plain.portrait).toBeNull();
    const at = portrayed.portrait;
    expect(at).not.toBeNull();
    if (at === null) return;
    const frame = { ...at, width: PORTRAIT_BOX.size, height: PORTRAIT_BOX.size };
    const { box } = portrayed;
    const { right, top, bottom } = WOOD_DIALOGUE.slices;
    const page = {
      x: box.x + 6,
      y: box.y + top,
      width: box.width - 6 - right,
      height: box.height - top - bottom,
    };
    expect(inside(frame, page)).toBe(true);
    expect(at.x + PORTRAIT_BOX.size).toBeLessThan(portrayed.text.x);
    expect(portrayed.text.width).toBeLessThan(plain.text.width);
  });

  it('writes the name of the speaker on the tab of the box', () => {
    const { tab } = WOOD_DIALOGUE;
    expect(plain.tab).toEqual({
      x: plain.box.x + tab.x,
      y: plain.box.y + tab.y,
      width: tab.width,
      height: tab.height,
    });
  });
});
