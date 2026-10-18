import strings from '@content/es/strings.json';
import { EMPTY_DESIGN, type Design } from '@levels/sandbox/design';
import { describe, expect, it } from 'vitest';
import { DESIGN_TOOLS } from '../input/designIntent';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from '../view/layout';
import { BOTTOM_ROWS, estimatedButtonWidth } from './bottomRows';
import { boxesOverlap, type Rect } from './boxDistance';
import {
  DESIGN_BUTTON_TEXT,
  DESIGN_BUTTONS,
  DESIGN_ROWS,
  designBarState,
  designToolbar,
  type DesignButton,
} from './designToolbar';
import { BUTTON_HEIGHT } from './panelLayout';

const text = strings as Readonly<Record<string, string>>;

/** The width of each button of the editor, measured as `Button` sizes itself. */
const WIDTHS = Object.fromEntries(
  DESIGN_BUTTONS.map((button) => {
    const label = text[DESIGN_BUTTON_TEXT[button]];
    if (label === undefined) throw new Error(`no string for ${button}`);
    return [button, estimatedButtonWidth(label)];
  }),
) as Record<DesignButton, number>;

/** One garden sprout, A, at (100, 100). */
const ONE: Design = { ...EMPTY_DESIGN, sprouts: [{ label: 'A', x: 100, y: 100 }] };

describe("the editor's bar", () => {
  const places = designToolbar(WIDTHS);
  const box = (button: DesignButton): Rect => ({
    ...places[button],
    width: WIDTHS[button],
    height: BUTTON_HEIGHT,
  });

  it("keeps the level's two bottom rows", () => {
    expect(DESIGN_ROWS).toEqual({ tools: LAYOUT.toolbarY, buttons: LAYOUT.bottomY });
  });

  it('lays the tools out left to right in their order, on the upper row', () => {
    const lefts = DESIGN_TOOLS.map((tool) => places[tool].x);
    expect(lefts[0]).toBe(BOTTOM_ROWS.margin);
    expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
    expect(DESIGN_TOOLS.every((tool) => places[tool].y === DESIGN_ROWS.tools)).toBe(true);
  });

  it('puts generate and clear at the right of the tools, and the rest on the lower row', () => {
    expect(places.generate.y).toBe(DESIGN_ROWS.tools);
    expect(places.clear.y).toBe(DESIGN_ROWS.tools);
    expect(places.clear.x + WIDTHS.clear).toBeLessThanOrEqual(CANVAS_WIDTH - BOTTOM_ROWS.margin);
    for (const button of ['back', 'redo', 'undo', 'share', 'play'] as const) {
      expect(places[button].y).toBe(DESIGN_ROWS.buttons);
    }
    expect(places.back.x + WIDTHS.back).toBeLessThanOrEqual(CANVAS_WIDTH - BOTTOM_ROWS.margin);
  });

  it('with the real words, every button is on the canvas and none touches another', () => {
    for (const button of DESIGN_BUTTONS) {
      const { x, width } = box(button);
      expect(x).toBeGreaterThanOrEqual(BOTTOM_ROWS.margin);
      expect(x + width).toBeLessThanOrEqual(CANVAS_WIDTH - BOTTOM_ROWS.margin);
    }
    for (const [i, a] of DESIGN_BUTTONS.entries()) {
      for (const b of DESIGN_BUTTONS.slice(i + 1)) {
        expect({ a, b, overlap: boxesOverlap(box(a), box(b), 0) }).toEqual({
          a,
          b,
          overlap: false,
        });
      }
    }
  });
});

describe("what the editor's bar offers now", () => {
  const state = (over: Partial<Parameters<typeof designBarState>[0]> = {}) =>
    designBarState({
      tool: 'vine',
      design: EMPTY_DESIGN,
      canUndo: false,
      canRedo: false,
      canPlay: true,
      canShare: true,
      ...over,
    });

  it('sinks the tool in hand', () => {
    expect(state().active).toBe('vine');
  });

  it('every tool, generate and the way back are always there', () => {
    const { enabled } = state();
    expect(DESIGN_TOOLS.every((tool) => enabled[tool])).toBe(true);
    expect([enabled.generate, enabled.back]).toEqual([true, true]);
  });

  it('undo and redo when the history has a step that way', () => {
    expect([state().enabled.undo, state().enabled.redo]).toEqual([false, false]);
    const both = state({ canUndo: true, canRedo: true }).enabled;
    expect([both.undo, both.redo]).toEqual([true, true]);
  });

  it('clear and share need a sprout; play needs a vine', () => {
    expect([state().enabled.clear, state().enabled.share, state().enabled.play]).toEqual([
      false,
      false,
      false,
    ]);
    const sprout = state({ design: ONE }).enabled;
    expect([sprout.clear, sprout.share, sprout.play]).toEqual([true, true, false]);
    const vine = state({
      design: {
        ...ONE,
        sprouts: [...ONE.sprouts, { label: 'B', x: 150, y: 100 }],
        vines: [['A', 'B']],
      },
    }).enabled;
    expect(vine.play).toBe(true);
  });

  it('play and share stay off until the free mode can do them', () => {
    const design: Design = {
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 150, y: 100 },
      ],
      vines: [['A', 'B']],
      lanterns: [],
    };
    const off = state({ design, canPlay: false, canShare: false }).enabled;
    expect([off.play, off.share]).toEqual([false, false]);
  });
});
