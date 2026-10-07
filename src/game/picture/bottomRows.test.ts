import strings from '@content/es/strings.json';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TOOL_ACTIONS, type ToolId } from '../input/tools';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import {
  BOTTOM_ROWS,
  CHAR_ADVANCE,
  estimatedButtonWidth,
  HUD_BUTTONS,
  hudRow,
  toolbarRow,
} from './bottomRows';

const text = strings as Readonly<Record<string, string>>;

/** The text of a key of `strings.json`; a missing one fails the test. */
const label = (key: string): string => {
  const found = text[key];
  if (found === undefined) throw new Error(`no string ${key}`);
  return found;
};

/** Every tool at once, as the toolbar would show them if a level opened them all. */
const allTools = Object.keys(TOOL_ACTIONS) as ToolId[];

/** Panels as [left, right] from their left edges and widths. */
const spans = (lefts: readonly number[], widths: readonly number[]): [number, number][] =>
  lefts.map((left, i) => [left, left + (widths[i] ?? 0)]);

/** Whether panels stay inside the canvas margins and no two of them touch. */
function fitsOnCanvas(lefts: readonly number[], widths: readonly number[]): boolean {
  const sorted = spans(lefts, widths).sort(([a], [b]) => a - b);
  const inside = sorted.every(
    ([left, right]) => left >= BOTTOM_ROWS.margin && right <= CANVAS_WIDTH - BOTTOM_ROWS.margin,
  );
  const apart = sorted.every(
    ([left], i) => i === 0 || left >= (sorted[i - 1]?.[1] ?? 0) + BOTTOM_ROWS.gap,
  );
  return inside && apart;
}

describe('the two bottom rows of the level HUD', () => {
  it('a button is as wide as its label in the 8 px monospace face, plus its padding', () => {
    expect(estimatedButtonWidth('?')).toBe(CHAR_ADVANCE + BOTTOM_ROWS.padding);
    // Accented letters are one character each, as the face draws them.
    expect(estimatedButtonWidth('Terminé')).toBe(7 * CHAR_ADVANCE + BOTTOM_ROWS.padding);
  });

  it('the toolbar goes left to right from the margin, a gap between tools', () => {
    expect(toolbarRow([10, 20, 30])).toEqual([
      BOTTOM_ROWS.margin,
      BOTTOM_ROWS.margin + 10 + BOTTOM_ROWS.gap,
      BOTTOM_ROWS.margin + 30 + 2 * BOTTOM_ROWS.gap,
    ]);
  });

  it('the HUD buttons go right to left from the margin, in their order', () => {
    const right = CANVAS_WIDTH - BOTTOM_ROWS.margin;
    expect(hudRow([10, 20])).toEqual([
      right - 10 - BOTTOM_ROWS.gap,
      right - 30 - 2 * BOTTOM_ROWS.gap,
    ]);
  });

  it('all seven tools fit in their row, with the labels of the game', () => {
    expect(allTools).toHaveLength(7);
    const widths = allTools.map((tool) => estimatedButtonWidth(label(`tool.${tool}`)));
    expect(fitsOnCanvas(toolbarRow(widths), widths)).toBe(true);
  });

  it('all eight HUD buttons fit in their row at once, with the labels of the game', () => {
    expect(HUD_BUTTONS).toHaveLength(8);
    const widths = HUD_BUTTONS.map((name) => estimatedButtonWidth(label(`hud.${name}`)));
    expect(fitsOnCanvas(hudRow(widths), widths)).toBe(true);
  });

  it('both rows still fit if the fallback face is a pixel wider per letter', () => {
    const wide = CHAR_ADVANCE + 1;
    const tools = allTools.map((tool) => estimatedButtonWidth(label(`tool.${tool}`), wide));
    const hud = HUD_BUTTONS.map((name) => estimatedButtonWidth(label(`hud.${name}`), wide));
    expect(fitsOnCanvas(toolbarRow(tools), tools)).toBe(true);
    expect(fitsOnCanvas(hudRow(hud), hud)).toBe(true);
  });

  it('buttons of any width never overlap, in either row', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 60 }), { maxLength: 8 }), (widths) => {
        for (const lefts of [toolbarRow(widths), hudRow(widths)]) {
          const sorted = spans(lefts, widths).sort(([a], [b]) => a - b);
          sorted.forEach(([left], i) => {
            if (i > 0)
              expect(left).toBeGreaterThanOrEqual((sorted[i - 1]?.[1] ?? 0) + BOTTOM_ROWS.gap);
          });
        }
      }),
    );
  });
});
