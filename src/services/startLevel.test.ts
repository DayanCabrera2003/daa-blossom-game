import { describe, expect, it } from 'vitest';
import { requestedLevel } from './startLevel';

const ids = ['0.1', '4.6', '4.10'];

describe('jumping straight to a level (teacher mode, GDD §5.8)', () => {
  it('opens the level named in the address when teacher mode is on', () => {
    expect(requestedLevel('?teacher&level=4.6', ids)).toBe('4.6');
    expect(requestedLevel('?level=4.10&teacher', ids)).toBe('4.10');
  });

  it('is ignored for players, and for levels that do not exist', () => {
    expect(requestedLevel('?level=4.6', ids)).toBeNull();
    expect(requestedLevel('?teacher&level=9.9', ids)).toBeNull();
    expect(requestedLevel('?teacher', ids)).toBeNull();
  });
});
