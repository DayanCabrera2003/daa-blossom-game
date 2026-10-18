import { describe, expect, it } from 'vitest';
import strings from '../../content/es/strings.json';
import { createTranslator } from '@services/i18n';
import { helpLines, KEY_SCREENS } from '../input/keyBindings';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { estimatedButtonWidth } from './bottomRows';
import { KEYS_CARD, keysCardLayout } from './keysCard';
import { BUTTON_HEIGHT } from './panelLayout';
import { charsIn, LINE_HEIGHT } from './textWrap';

const t = createTranslator(strings);

/** Every card the game can show: the lines of each screen, in both modes, and the closing line. */
const cards = KEY_SCREENS.flatMap((screen) =>
  [false, true].map((teacher) => [
    ...helpLines(screen, teacher).map((line) => t(`keys.${line}`)),
    t('keys.pointer'),
  ]),
);

describe('the card of the keys', () => {
  it('writes every line on one row of the card, in the pixel font', () => {
    const chars = charsIn(KEYS_CARD.width - 2 * KEYS_CARD.pad);
    for (const card of cards) {
      for (const text of card) expect([...text].length, text).toBeLessThanOrEqual(chars);
    }
    expect(estimatedButtonWidth(t('keys.close'))).toBeLessThan(KEYS_CARD.width);
  });

  it('stays on the canvas with the most lines any screen has, centred', () => {
    const most = Math.max(...cards.map((card) => card.length));
    const layout = keysCardLayout(most, BUTTON_HEIGHT);
    const { panel } = layout;
    expect(panel.x * 2 + panel.width).toBe(CANVAS_WIDTH);
    expect(panel.y).toBeGreaterThan(0);
    expect(panel.y + panel.height).toBeLessThan(CANVAS_HEIGHT);
  });

  it('stacks the title, the lines and "Cerrar" without touching, on the face of the wood', () => {
    const layout = keysCardLayout(4, BUTTON_HEIGHT);
    const { slices } = KEYS_CARD.frame;
    expect(layout.lines).toHaveLength(4);
    expect(layout.title + 3).toBeGreaterThanOrEqual(slices.top);
    expect(layout.lines[0]).toBeGreaterThanOrEqual(layout.title + LINE_HEIGHT + 2);
    layout.lines.forEach((y, i) => expect(y).toBe((layout.lines[0] ?? 0) + i * LINE_HEIGHT));
    expect((layout.lines.at(-1) ?? 0) + LINE_HEIGHT).toBeLessThanOrEqual(layout.close - 1);
    const bottom = layout.close - 1 + BUTTON_HEIGHT;
    expect(layout.panel.height - bottom).toBeGreaterThanOrEqual(slices.bottom);
  });
});
