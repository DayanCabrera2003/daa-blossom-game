import { describe, expect, it } from 'vitest';
import { neighbourLevels } from './teacherJump';

const ids = ['0.1', '0.2', '4.6', '4.10'];

describe('jumping to the level before or after (teacher mode, PageUp and PageDown)', () => {
  it('goes to the level before and the one after in the catalog', () => {
    expect(neighbourLevels(ids, '0.2')).toEqual({ previous: '0.1', next: '4.6' });
  });

  it('has none before the first level nor after the last', () => {
    expect(neighbourLevels(ids, '0.1')).toEqual({ previous: null, next: '0.2' });
    expect(neighbourLevels(ids, '4.10')).toEqual({ previous: '4.6', next: null });
  });

  it('has neither for a level not in the catalog', () => {
    expect(neighbourLevels(ids, '9.9')).toEqual({ previous: null, next: null });
  });
});
