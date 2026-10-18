import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES } from '@levels/codex';
import { codexEntries } from './entries';

describe('codexEntries', () => {
  it('bundles the fourteen entries of the Codex, parsed, by id', () => {
    const entries = codexEntries();
    expect([...entries.keys()].sort()).toEqual([...CODEX_ENTRIES].sort());
    expect(entries.get('C3')?.id).toBe('C3');
    expect(codexEntries('es')).toBe(entries);
  });
});
