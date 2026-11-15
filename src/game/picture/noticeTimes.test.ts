import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { noticeTimes, NOTICE_GAP_MS } from './noticeTimes';
import { TOAST_FADE_MS, toastDuration } from './toastDuration';

describe('when each notice of a run shows', () => {
  it('the first shows at the start given', () => {
    expect(noticeTimes(['Una rana en el estanque.'], 800)).toEqual([800]);
    expect(noticeTimes([], 800)).toEqual([]);
  });

  it('short notices follow each other every 3.4 s, as before', () => {
    expect(noticeTimes(['Una rana.', 'Abejas.', 'Faroles.'], 800)).toEqual([800, 4200, 7600]);
  });

  it('a notice never covers the one before it while that one is still being read', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 160 }), { maxLength: 6 }), (messages) => {
        const times = noticeTimes(messages, 800);
        messages.slice(1).forEach((_, i) => {
          const before = messages[i] ?? '';
          expect((times[i + 1] ?? 0) - (times[i] ?? 0)).toBe(
            toastDuration(before) + TOAST_FADE_MS + NOTICE_GAP_MS,
          );
        });
      }),
    );
  });
});
