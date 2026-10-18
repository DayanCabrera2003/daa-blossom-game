import strings from '@content/es/strings.json';
import { EMPTY_DESIGN, type Design } from '@levels/sandbox/design';
import { MAX_SPROUTS, MAX_VINES } from '@levels/sandbox/limits';
import { describe, expect, it } from 'vitest';
import { DESIGN_TOOLS } from '../input/designIntent';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { CHAR_ADVANCE } from './bottomRows';
import { DESIGN_HEADER, designHeader } from './designHeader';

const text = strings as Readonly<Record<string, string>>;

/** How wide a text of the header is drawn, with its parameters at their widest. */
const width = (key: string, params: Readonly<Record<string, number>> = {}): number => {
  const filled = (text[key] ?? '').replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? ''),
  );
  return [...filled].length * CHAR_ADVANCE;
};

/** A at (100, 100) and B at (150, 100), joined. */
const TWO: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100 },
    { label: 'B', x: 150, y: 100 },
  ],
  vines: [['A', 'B']],
  lanterns: [],
};

describe("the editor's header", () => {
  it('counts the sprouts and vines against their limits', () => {
    expect(designHeader(TWO, 'sprout', false).count).toEqual({
      key: 'sandbox.count',
      params: { sprouts: 2, maxSprouts: MAX_SPROUTS, vines: 1, maxVines: MAX_VINES },
    });
    expect(designHeader(EMPTY_DESIGN, 'sprout', false).count.params.sprouts).toBe(0);
  });

  it('says what the tool in hand asks of the hand, or how the generate menu works', () => {
    expect(designHeader(TWO, 'lantern', false).prompt).toEqual({
      key: 'sandbox.prompt.lantern',
      params: {},
    });
    expect(designHeader(TWO, 'lantern', true).prompt.key).toBe('sandbox.prompt.generate');
  });

  it('with the real words, the title and the fullest count share the top line', () => {
    const title = width('sandbox.title');
    const count = width('sandbox.count', {
      sprouts: MAX_SPROUTS,
      maxSprouts: MAX_SPROUTS,
      vines: MAX_VINES,
      maxVines: MAX_VINES,
    });
    expect(DESIGN_HEADER.margin + title + DESIGN_HEADER.gap + count).toBeLessThanOrEqual(
      CANVAS_WIDTH - DESIGN_HEADER.margin,
    );
  });

  it('with the real words, every prompt fits on the second line', () => {
    for (const key of [
      ...DESIGN_TOOLS.map((tool) => `sandbox.prompt.${tool}`),
      'sandbox.prompt.generate',
    ]) {
      expect({ key, fits: width(key) <= CANVAS_WIDTH - 2 * DESIGN_HEADER.margin }).toEqual({
        key,
        fits: true,
      });
    }
  });
});
