import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { designArb } from '../../../tests/support/designs';
import { LAYOUT_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { EMPTY_DESIGN, type Design } from './design';
import { importText } from './importText';
import { shareOf } from './share';

/** A path A–B–C with A=B lit. */
const SMALL: Design = {
  sprouts: [
    { label: 'A', x: 60, y: 100 },
    { label: 'B', x: 120, y: 100 },
    { label: 'C', x: 180, y: 100 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
  ],
  lanterns: [['A', 'B']],
};

describe('what the free mode offers to share', () => {
  it('is nothing while the design is empty', () => {
    expect(shareOf(EMPTY_DESIGN)).toEqual({ code: null, json: null });
  });

  it('is the garden code and the level file, written out', () => {
    const shared = shareOf(SMALL);
    expect(shared.code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(shared.json).not.toBeNull();
    expect(JSON.parse(shared.json ?? '')).toMatchObject({ id: '9.1', draft: true });
    // Written out on several lines, for a reader who opens the file.
    expect(shared.json?.split('\n').length).toBeGreaterThan(10);
  });

  it('offers even a single sprout with no vine, as a code and a file', () => {
    const lonely: Design = { sprouts: [{ label: 'A', x: 60, y: 100 }], vines: [], lanterns: [] };
    const { code, json } = shareOf(lonely);
    expect(importText(code ?? '')).toMatchObject({ ok: true });
    expect(importText(json ?? '')).toEqual({ ok: true, value: lonely });
  });

  it(
    'property: the code and the file both open the same garden again',
    () => {
      fc.assert(
        fc.property(designArb(), (design) => {
          const { code, json } = shareOf(design);
          if (code === null) throw new Error('a design with sprouts has a code');
          const fromCode = importText(code);
          expect(fromCode.ok).toBe(true);
          if (fromCode.ok) expect(shareOf(fromCode.value).code).toBe(code);
          expect(importText(json ?? '')).toEqual({ ok: true, value: design });
        }),
        { numRuns: 100 },
      );
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );
});
