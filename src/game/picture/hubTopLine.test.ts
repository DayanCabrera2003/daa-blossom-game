import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import strings from '../../content/es/strings.json';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { estimatedButtonWidth } from './bottomRows';
import { boxesOverlap } from './boxDistance';
import { BOOK_ICON, iconRoom } from './buttonIcon';
import { hubCounter } from './hubCounter';
import { HUB } from './hubLayout';
import { hubTopLine, TOP_LINE } from './hubTopLine';
import { BUTTON_HEIGHT } from './panelLayout';
import { PIXEL_FONT } from './pixelFont';
import { labelSeal } from './signSeal';

/** The width the pixel font gives `text`, one cell per character. */
const text = (words: string): number => [...words].length * PIXEL_FONT.advance;

/** The side of the settings' gear (`view/GearButton.ts`). */
const GEAR = 13;

/** The signs of the top line with the game's own words, right to left after the gear. */
const CODEX =
  estimatedButtonWidth(strings['hub.codex'] + ' '.repeat(labelSeal(strings['codex.new']).spaces)) +
  iconRoom([BOOK_ICON]);
const NOTEBOOK = estimatedButtonWidth(strings['hub.notebook']);
/** The free mode's sign, which comes in a later phase of plan 08 with these words. */
const SANDBOX = estimatedButtonWidth('Modo libre');

/** Every box of a top line, the gear's included. */
const boxesOf = (line: ReturnType<typeof hubTopLine>) => [
  line.title,
  ...(line.badge === null ? [] : [line.badge]),
  line.counter,
  line.gear,
  ...line.signs,
];

describe("the hub's top line", () => {
  it('puts the gear at the right margin and the signs right to left before it', () => {
    const line = hubTopLine({
      title: 48,
      badge: null,
      counter: 48,
      signs: [80, 50],
      gear: GEAR,
      signHeight: BUTTON_HEIGHT,
    });
    expect(line.gear.x + line.gear.width).toBe(CANVAS_WIDTH - HUB.margin);
    expect(line.signs.map((sign) => sign.x)).toEqual([
      line.gear.x - HUB.gap - 80,
      line.gear.x - HUB.gap - 80 - HUB.gap - 50,
    ]);
    expect(line.signs.every((sign) => sign.y === HUB.topLineY - 1)).toBe(true);
    expect(line.clear).toBe(true);
  });

  it('writes the counter after the title, or after the teacher badge when there is one', () => {
    const plain = hubTopLine({
      title: 48,
      badge: null,
      counter: 48,
      signs: [],
      gear: GEAR,
      signHeight: 14,
    });
    expect(plain.title.x).toBe(HUB.margin);
    expect(plain.counter.x).toBe(HUB.margin + 48 + TOP_LINE.gap);
    const teacher = hubTopLine({
      title: 48,
      badge: 78,
      counter: 48,
      signs: [],
      gear: GEAR,
      signHeight: 14,
    });
    expect(teacher.badge?.x).toBe(HUB.margin + 48 + TOP_LINE.gap);
    expect(teacher.counter.x).toBe(HUB.margin + 48 + TOP_LINE.gap + 78 + TOP_LINE.gap);
    // The texts share the title's line.
    expect(new Set([teacher.title.y, teacher.badge?.y, teacher.counter.y]).size).toBe(1);
  });

  it('fits at 480 px with every sign, the teacher badge and a three-digit counter', () => {
    const line = hubTopLine({
      title: text(strings['hub.title']),
      badge: text(strings['teacher.badge']),
      counter: hubCounter(999, 99, 8).width,
      signs: [CODEX, NOTEBOOK, SANDBOX],
      gear: GEAR,
      signHeight: BUTTON_HEIGHT,
    });
    expect(line.clear).toBe(true);
    const boxes = boxesOf(line);
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => expect(boxesOverlap(a, b, 1)).toBe(false)),
    );
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(HUB.margin);
      expect(box.x + box.width).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
      // Above the first chapter.
      expect(box.y + box.height).toBeLessThanOrEqual(HUB.top);
    }
  });

  it('says when its boxes would touch, whatever their widths', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.option(fc.integer({ min: 0, max: 200 })),
        fc.integer({ min: 0, max: 200 }),
        fc.array(fc.integer({ min: 10, max: 200 }), { maxLength: 4 }),
        (title, badge, counter, signs) => {
          const line = hubTopLine({
            title,
            badge,
            counter,
            signs,
            gear: GEAR,
            signHeight: BUTTON_HEIGHT,
          });
          const boxes = boxesOf(line);
          const touching = boxes.some((a, i) =>
            boxes.slice(i + 1).some((b) => boxesOverlap(a, b, 1)),
          );
          const outside = line.signs.some((sign) => sign.x < HUB.margin);
          expect(line.clear).toBe(!touching && !outside);
        },
      ),
    );
  });
});
