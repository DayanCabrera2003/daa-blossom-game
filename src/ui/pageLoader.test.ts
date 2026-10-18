import { describe, expect, it } from 'vitest';
import { dismissPageLoader, PAGE_LOADER_ID } from './pageLoader';

describe('dismissPageLoader', () => {
  it("takes the page's lantern off the page", () => {
    let removed = 0;
    const asked: string[] = [];
    const page = {
      getElementById: (id: string) => {
        asked.push(id);
        return { remove: () => (removed += 1) };
      },
    };
    dismissPageLoader(page);
    expect(asked).toEqual([PAGE_LOADER_ID]);
    expect(removed).toBe(1);
  });

  it('does nothing on a page that has no lantern (already gone)', () => {
    expect(() => dismissPageLoader({ getElementById: () => null })).not.toThrow();
  });
});
