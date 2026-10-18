import strings from '@content/es/strings.json';
import { GENERATORS } from '@levels/sandbox/generators';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { CHAR_ADVANCE, estimatedButtonWidth } from './bottomRows';
import { boxesOverlap, type Rect } from './boxDistance';
import { DRAWER, generateDrawer, type DrawerWidths } from './generateDrawer';
import { BUTTON_HEIGHT } from './panelLayout';

const text = strings as Readonly<Record<string, string>>;
const label = (key: string): string => {
  const found = text[key];
  if (found === undefined) throw new Error(`no string ${key}`);
  return found;
};

/** The widths of the menu's pieces with the real words, the size at its widest ("Tamaño 20"). */
const WIDTHS: DrawerWidths = {
  generators: GENERATORS.map((generator) => estimatedButtonWidth(label(generator.textKey))),
  smaller: estimatedButtonWidth(label('sandbox.gen.smaller')),
  size: [...label('sandbox.gen.size').replace('{size}', '20')].length * CHAR_ADVANCE,
  larger: estimatedButtonWidth(label('sandbox.gen.larger')),
  another: estimatedButtonWidth(label('sandbox.gen.another')),
  done: estimatedButtonWidth(label('sandbox.gen.done')),
};

describe('the generate menu, a wooden drawer over the bottom rows', () => {
  const layout = generateDrawer(WIDTHS);
  const boxes: [string, Rect][] = [
    ...layout.generators.map((at, i): [string, Rect] => [
      `generator ${i}`,
      { ...at, width: WIDTHS.generators[i] ?? 0, height: BUTTON_HEIGHT },
    ]),
    ...(['smaller', 'size', 'larger', 'another', 'done'] as const).map((part): [string, Rect] => [
      part,
      { ...layout[part], width: WIDTHS[part], height: BUTTON_HEIGHT },
    ]),
  ];

  it('sits on the bottom of the canvas, across it, low enough to leave the garden in view', () => {
    const { panel } = layout;
    expect(panel.x).toBe(DRAWER.margin);
    expect(panel.x + panel.width).toBe(CANVAS_WIDTH - DRAWER.margin);
    expect(panel.y + panel.height).toBe(CANVAS_HEIGHT - DRAWER.margin);
    expect(panel.y).toBeGreaterThanOrEqual(200);
  });

  it('with the real words, everything is inside the wood and nothing touches anything else', () => {
    const { panel } = layout;
    for (const [name, box] of boxes) {
      const inside =
        box.x >= panel.x + DRAWER.padX &&
        box.x + box.width <= panel.x + panel.width - DRAWER.padX &&
        box.y >= panel.y + DRAWER.padY &&
        box.y + box.height <= panel.y + panel.height - DRAWER.padY;
      expect({ name, inside }).toEqual({ name, inside: true });
    }
    for (const [i, [a, first]] of boxes.entries()) {
      for (const [b, second] of boxes.slice(i + 1)) {
        expect({ a, b, overlap: boxesOverlap(first, second, 0) }).toEqual({ a, b, overlap: false });
      }
    }
  });

  it('lists the generators in their order, then − size + and "Otro al azar", "Listo" at the right', () => {
    const ys = layout.generators.map((at) => at.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(layout.smaller.x).toBeLessThan(layout.size.x);
    expect(layout.size.x).toBeLessThan(layout.larger.x);
    expect(layout.larger.x).toBeLessThan(layout.another.x);
    expect(layout.done.x + WIDTHS.done).toBe(CANVAS_WIDTH - DRAWER.margin - DRAWER.padX);
    expect(layout.done.y).toBe(layout.smaller.y);
  });
});
