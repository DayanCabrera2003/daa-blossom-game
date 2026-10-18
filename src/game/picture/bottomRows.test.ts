import strings from '@content/es/strings.json';
import { catalog } from '@levels/catalog';
import { isUiUnlocked } from '@levels/uiUnlocks';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { availableTools, TOOL_ACTIONS, type ToolId } from '../input/tools';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { ActionType } from '@core/rules/actions';
import { unwrap } from '@core/shared/result';
import type { Design } from '@levels/sandbox/design';
import { toPlayable } from '@levels/sandbox/toLevel';
import type { SandboxAccess } from '@services/sandboxAccess';
import { levelScreenOf } from '../systems/levelScreenOf';
import { GEAR_SIZE } from '../view/GearButton';
import {
  besideLeft,
  bookButtonLeft,
  BOTTOM_ROWS,
  CHAR_ADVANCE,
  estimatedButtonWidth,
  HUD_BUTTONS,
  hudRow,
  ordersRow,
  toolbarRow,
  traceButtonLeft,
} from './bottomRows';
import { BOOK_ICON, iconRoom, TOOL_ICONS } from './buttonIcon';

/** Every action of the game. */
const ALL_ACTIONS = Object.keys(UNLOCKED_AT) as ActionType[];

/** The free mode in teacher mode: every action and both orders. */
const TEACHER: SandboxAccess = {
  exists: true,
  actions: ALL_ACTIONS,
  gardener: true,
  scarecrows: true,
  stones: true,
  interfaceAt: '8.1',
};

/** A pair of sprouts: a garden of the free mode to lay the screen out for. */
const PAIR: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100 },
    { label: 'B', x: 200, y: 100 },
  ],
  vines: [['A', 'B']],
  lanterns: [],
};

/** The labels of the free mode's orders, in the order they sit. */
const ORDER_KEYS = ['sandbox.solve', 'sandbox.certify'];

const text = strings as Readonly<Record<string, string>>;

/** The text of a key of `strings.json`; a missing one fails the test. */
const label = (key: string): string => {
  const found = text[key];
  if (found === undefined) throw new Error(`no string ${key}`);
  return found;
};

/** Every tool at once, as the toolbar would show them if a level opened them all. */
const allTools = Object.keys(TOOL_ACTIONS) as ToolId[];

/** The width of a tool's button: its name and, for some, the icon before it. */
const toolWidth = (tool: ToolId, advance?: number): number =>
  estimatedButtonWidth(label(`tool.${tool}`), advance) + iconRoom(TOOL_ICONS[tool] ?? []);

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
  it('a button is as wide as its label in the pixel font, plus its padding', () => {
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

  it('all seven tools fit in their row, with the labels and icons of the game', () => {
    expect(allTools).toHaveLength(7);
    const widths = allTools.map((tool) => toolWidth(tool));
    expect(fitsOnCanvas(toolbarRow(widths), widths)).toBe(true);
  });

  it('all eight HUD buttons fit in their row at once, with the labels of the game', () => {
    expect(HUD_BUTTONS).toHaveLength(8);
    const widths = HUD_BUTTONS.map((name) => estimatedButtonWidth(label(`hud.${name}`)));
    expect(fitsOnCanvas(hudRow(widths), widths)).toBe(true);
  });

  it('a garden of the free mode fits: its buttons, the Códex and the trace below, its tools and orders above', () => {
    const screen = levelScreenOf(unwrap(toPlayable(PAIR, ALL_ACTIONS)), TEACHER);
    const names = screen.hudButtons.map((name) =>
      name === 'back' ? screen.backLabel : `hud.${name}`,
    );
    // Below: the gear, the Códex and the trace from the left; the buttons from the right.
    const width = (key: string, advance?: number): number =>
      estimatedButtonWidth(label(key), advance);
    const book = width('hud.book') + iconRoom([BOOK_ICON]);
    const bookLeft = bookButtonLeft(GEAR_SIZE);
    const trace = width('hud.trace');
    const buttons = names.map((key) => width(key));
    const lefts = [BOTTOM_ROWS.margin, bookLeft, besideLeft(bookLeft + book), ...hudRow(buttons)];
    expect(fitsOnCanvas(lefts, [GEAR_SIZE, book, trace, ...buttons])).toBe(true);
    // In the wider fallback face the buttons alone still fit, as in any level.
    const wide = names.map((key) => width(key, CHAR_ADVANCE + 1));
    expect(fitsOnCanvas(hudRow(wide), wide)).toBe(true);
    // Above: every tool the free mode may give (no inspecting: it has no fog), then its orders.
    const level = unwrap(toPlayable(PAIR, ALL_ACTIONS));
    const tools = availableTools(level.start.allowed, true);
    expect(tools).not.toContain('inspect');
    const widths = tools.map((tool) => toolWidth(tool));
    const orders = ORDER_KEYS.map((key) => estimatedButtonWidth(label(key)));
    expect(
      fitsOnCanvas([...toolbarRow(widths), ...ordersRow(orders)], [...widths, ...orders]),
    ).toBe(true);
  });

  it("the free mode's orders end the tools' row at the margin, in their order", () => {
    const right = CANVAS_WIDTH - BOTTOM_ROWS.margin;
    expect(ordersRow([10, 20])).toEqual([right - 30 - BOTTOM_ROWS.gap, right - 20]);
    expect(besideLeft(50)).toBe(50 + BOTTOM_ROWS.gap);
  });

  it('both rows still fit if the fallback face is a pixel wider per letter', () => {
    const wide = CHAR_ADVANCE + 1;
    const tools = allTools.map((tool) => toolWidth(tool, wide));
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

  it("the teacher's trace button ends the tools' row, clear of the tools of every level", () => {
    const trace = estimatedButtonWidth(label('hud.trace'));
    const left = traceButtonLeft(trace);
    expect(left + trace).toBe(CANVAS_WIDTH - BOTTOM_ROWS.margin);
    for (const level of catalog()) {
      const tools = availableTools(level.start.allowed, isUiUnlocked('layers', level.data.id));
      const widths = [...tools.map((tool) => toolWidth(tool)), trace];
      const lefts = [...toolbarRow(widths.slice(0, -1)), left];
      expect(fitsOnCanvas(lefts, widths), level.data.id).toBe(true);
    }
  });
});
