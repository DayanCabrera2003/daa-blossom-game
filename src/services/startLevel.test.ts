import { describe, expect, it } from 'vitest';
import { requestedCodex, requestedLevel } from './startLevel';

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

describe('opening the Codex straight away (teacher mode)', () => {
  it('opens the entry named in the address, and the tab when one is named', () => {
    expect(requestedCodex('?teacher&codex=C8')).toEqual({ book: 'codex', entry: 'C8' });
    expect(requestedCodex('?teacher&codex=c10&tab=formal')).toEqual({
      book: 'codex',
      entry: 'C10',
      tab: 'formal',
    });
  });

  it('is ignored for players and for entries that do not exist; a wrong tab is left out', () => {
    expect(requestedCodex('?codex=C8')).toBeNull();
    expect(requestedCodex('?teacher&codex=C99')).toBeNull();
    expect(requestedCodex('?teacher')).toBeNull();
    expect(requestedCodex('?teacher&codex=C3&tab=appendix')).toEqual({
      book: 'codex',
      entry: 'C3',
    });
  });
});
