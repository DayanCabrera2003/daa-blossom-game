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

  /** A storage the browser offers that refuses writes after `allowed` of them (a full quota). */
  const filling = (allowed: number) => {
    const data = new Map<string, string>();
    let writes = 0;
    return {
      data,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        writes += 1;
        if (writes > allowed) throw new DOMException('quota', 'QuotaExceededError');
        data.set(k, v);
      },
    };
  };

  it('a write refused midway (a full quota) keeps the session: the value is read back from memory', () => {
    const offered = filling(1);
    const store = browserStorage(() => offered);
    store.setItem('save', 'one');
    expect(() => store.setItem('save', 'two')).not.toThrow();
    expect(store.getItem('save')).toBe('two');
    // What the browser kept is the last write it took.
    expect(offered.data.get('save')).toBe('one');
  });

  it('says once that it cannot keep the progress, on the first refused write', () => {
    const store = browserStorage(() => filling(1));
    let told = 0;
    store.onRefused(() => (told += 1));
    store.setItem('a', '1');
    expect(told).toBe(0);
    store.setItem('a', '2');
    store.setItem('b', '3');
    expect(told).toBe(1);
  });

  it('without access at all, says so at once to whoever asks, once', () => {
    const store = browserStorage(() => {
      throw new Error('SecurityError');
    });
    let told = 0;
    store.onRefused(() => (told += 1));
    expect(told).toBe(1);
    store.setItem('k', 'v');
    expect(told).toBe(1);
  });

  it('a read the browser refuses midway gives what this session wrote, or nothing', () => {
    let blocked = false;
    const data = new Map<string, string>([['kept', 'old']]);
    const store = browserStorage(() => ({
      getItem: (k: string) => {
        if (blocked) throw new Error('SecurityError');
        return data.get(k) ?? null;
      },
      setItem: (k: string, v: string) => {
        if (blocked) throw new Error('SecurityError');
        data.set(k, v);
      },
    }));
    expect(store.getItem('kept')).toBe('old');
    blocked = true;
    expect(store.getItem('kept')).toBeNull();
    store.setItem('kept', 'new');
    expect(store.getItem('kept')).toBe('new');
  });
});
