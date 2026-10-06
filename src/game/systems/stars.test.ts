import { describe, expect, it } from 'vitest';
import { computeStars } from './stars';

describe('stars when a level is won (GDD §5.4)', () => {
  it('completing always gives the first star, which hints never take away (§5.3)', () => {
    expect(computeStars({ hintsOpened: 3, waterSpent: 9, waterBudget: 2 })).toEqual({
      total: 1,
      noHints: false,
      withinWater: false,
    });
  });

  it('a star for not opening any hint', () => {
    expect(computeStars({ hintsOpened: 0, waterSpent: 0, waterBudget: null })).toEqual({
      total: 2,
      noHints: true,
      withinWater: null,
    });
  });

  it('a star for staying within the water, in levels that have a budget', () => {
    expect(computeStars({ hintsOpened: 0, waterSpent: 18, waterBudget: 18 })).toEqual({
      total: 3,
      noHints: true,
      withinWater: true,
    });
    expect(computeStars({ hintsOpened: 1, waterSpent: 19, waterBudget: 18 }).withinWater).toBe(
      false,
    );
  });
});
