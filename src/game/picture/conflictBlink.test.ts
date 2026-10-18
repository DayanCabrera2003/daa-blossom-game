import { describe, expect, it } from 'vitest';
import { CONFLICT_BLINKS, conflictBlink } from './conflictBlink';

describe('the conflict of sun and moon blinking (GDD §4.1, key animation 3)', () => {
  it('turns from sun to moon and back, once per blink', () => {
    const tones = Array.from(
      { length: 2 * CONFLICT_BLINKS },
      (_, i) => conflictBlink((i + 0.5) / (2 * CONFLICT_BLINKS)).tone,
    );
    expect(tones).toEqual(Array.from({ length: CONFLICT_BLINKS }, () => ['sun', 'moon']).flat());
  });

  it('starts bright and fades as the step ends, staying within its range', () => {
    expect(conflictBlink(0)).toEqual({ tone: 'sun', alpha: 1 });
    expect(conflictBlink(0.99).alpha).toBeLessThan(conflictBlink(0.5).alpha);
    expect(conflictBlink(1).tone).toBe('moon');
    expect(conflictBlink(1).alpha).toBeGreaterThan(0);
    expect(conflictBlink(-1)).toEqual(conflictBlink(0));
  });
});
