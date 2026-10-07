import { describe, expect, it } from 'vitest';
import { browserStorage } from './browserStorage';

describe('browser storage', () => {
  it('uses the storage the browser offers', () => {
    const data = new Map<string, string>();
    const offered = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const store = browserStorage(() => offered);
    store.setItem('k', 'v');
    expect(data.get('k')).toBe('v');
    expect(store.getItem('k')).toBe('v');
  });

  it('falls back to memory when the browser refuses access (private mode, blocked cookies)', () => {
    const store = browserStorage(() => {
      throw new Error('SecurityError');
    });
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('v');
    expect(store.getItem('missing')).toBeNull();
  });

  it('falls back to memory where there is no storage at all (tests, tools)', () => {
    const store = browserStorage(() => undefined);
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('v');
  });

  it('by default looks for the real localStorage, and copes when there is none (as here, in Node)', () => {
    const store = browserStorage();
    store.setItem('florecer.test', '1');
    expect(store.getItem('florecer.test')).toBe('1');
  });
});
