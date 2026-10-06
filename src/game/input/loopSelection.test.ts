import { describe, expect, it } from 'vitest';
import { extendLoop } from './loopSelection';

describe('choosing a loop to fold', () => {
  it('collects sprouts in the order they are touched', () => {
    expect(extendLoop([], 2)).toEqual({ vertices: [2], closed: null });
    expect(extendLoop([2, 3], 4)).toEqual({ vertices: [2, 3, 4], closed: null });
  });

  it('touching the first sprout again closes the loop', () => {
    expect(extendLoop([2, 3, 4], 2)).toEqual({ vertices: [], closed: [2, 3, 4] });
  });

  it('a loop needs three sprouts before it can close', () => {
    expect(extendLoop([2, 3], 2)).toEqual({ vertices: [2, 3], closed: null });
  });

  it('touching the last sprout again takes it back', () => {
    expect(extendLoop([2, 3, 4], 4)).toEqual({ vertices: [2, 3], closed: null });
    expect(extendLoop([2], 2)).toEqual({ vertices: [], closed: null });
  });

  it('touching a sprout already in the middle of the loop changes nothing', () => {
    expect(extendLoop([2, 3, 4], 3)).toEqual({ vertices: [2, 3, 4], closed: null });
  });
});
