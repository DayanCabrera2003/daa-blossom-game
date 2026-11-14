import { catalog } from '@levels/catalog';
import { hasFormalBet, starsCeiling } from '@levels/starsCeiling';
import { describe, expect, it } from 'vitest';
import { computeStars } from '../systems/stars';
import { starRows } from './starRows';

describe('the rows of the stars of a won level (GDD §5.4)', () => {
  it('a level of two stars shows two rows: completing it, and no hints', () => {
    const stars = computeStars({
      hintsOpened: 1,
      waterSpent: 0,
      waterBudget: null,
      betRight: null,
    });
    expect(starRows(stars)).toEqual([
      { star: 'done', earned: true },
      { star: 'noHints', earned: false },
    ]);
  });

  it('a level with water shows its row, earned only within the budget', () => {
    const played = { hintsOpened: 0, waterBudget: 4, betRight: null };
    expect(starRows(computeStars({ ...played, waterSpent: 4 }))).toEqual([
      { star: 'done', earned: true },
      { star: 'noHints', earned: true },
      { star: 'water', earned: true },
    ]);
    expect(starRows(computeStars({ ...played, waterSpent: 5 }))[2]).toEqual({
      star: 'water',
      earned: false,
    });
  });

  it('a missed formal bet still shows its row, unearned', () => {
    const played = { hintsOpened: 0, waterSpent: 0, waterBudget: null };
    expect(starRows(computeStars({ ...played, betRight: false }))).toEqual([
      { star: 'done', earned: true },
      { star: 'noHints', earned: true },
      { star: 'bet', earned: false },
    ]);
    expect(starRows(computeStars({ ...played, betRight: true }))[2]).toEqual({
      star: 'bet',
      earned: true,
    });
  });

  it('water and a formal bet together give four rows, in the order the stars are told', () => {
    const stars = computeStars({ hintsOpened: 2, waterSpent: 9, waterBudget: 3, betRight: true });
    expect(starRows(stars).map((row) => row.star)).toEqual(['done', 'noHints', 'water', 'bet']);
  });

  it('the earned rows are as many as the stars won', () => {
    for (const hintsOpened of [0, 1]) {
      for (const waterBudget of [null, 3]) {
        for (const betRight of [null, false, true]) {
          const stars = computeStars({ hintsOpened, waterSpent: 3, waterBudget, betRight });
          expect(starRows(stars).filter((row) => row.earned)).toHaveLength(stars.total);
        }
      }
    }
  });

  it('every level of the catalogue shows as many rows as the stars it can give', () => {
    for (const { data } of catalog()) {
      // However the level was played: a formal bet always ends answered, right or wrong.
      const stars = computeStars({
        hintsOpened: 1,
        waterSpent: 0,
        waterBudget: data.water,
        betRight: hasFormalBet(data) ? false : null,
      });
      expect(starRows(stars), data.id).toHaveLength(starsCeiling(data));
    }
  });
});
