import { describe, expect, it } from 'vitest';
import { catalog } from '../src/levels/catalog';
import { openCosmetics } from '../src/services/cosmetics';
import { catalogEntries, unlockedLevels } from '../src/services/progress';
import { loadSave, SAVE_KEY, writeSave, type SaveData } from '../src/services/save';
import { secretFlowers } from '../src/services/secretFlowers';
import { seeds } from '../src/services/seeds';
import { totalStars } from '../src/services/starCount';
import { consoleLine, isSavePoint, SAVE_POINTS, savePoint } from '../tools/saves/points';
import { memoryStore } from './support/memoryStore';

// The synthetic saves of the author's kit (plan 09, phase 11): each one is a save the game reads
// back as written, and each point leaves the game where its name says.

const levels = catalog();
const entries = catalogEntries(levels);

/** What the game reads back of a save written as the browser would keep it. */
const roundTrip = (save: SaveData): SaveData => {
  const store = memoryStore();
  writeSave(store, save);
  return loadSave(store);
};

describe('the synthetic saves of the author kit', () => {
  it.each(SAVE_POINTS)('%s is a save the game reads back as written', (point) => {
    const save = savePoint(levels, point);
    expect(roundTrip(save)).toEqual(save);
  });

  it('fresh is a new player: only 0.1 open', () => {
    expect([...unlockedLevels(entries, savePoint(levels, 'fresh'), false)]).toEqual(['0.1']);
  });

  it('after-ch2, after-ch4 and after-ch6 open the first level of the next chapter, not the one after', () => {
    const open = (point: 'after-ch2' | 'after-ch4' | 'after-ch6'): Set<string> =>
      unlockedLevels(entries, savePoint(levels, point), false);
    expect(open('after-ch2').has('3.1')).toBe(true);
    expect(open('after-ch2').has('4.1')).toBe(false);
    expect(open('after-ch4').has('5.1')).toBe(true);
    expect(open('after-ch4').has('6.1')).toBe(false);
    expect(open('after-ch6').has('7.1')).toBe(true);
    expect(open('after-ch6').has('7.2')).toBe(false);
  });

  it('after-ch4 writes the notebooks of the levels won, in the order of the game', () => {
    const save = savePoint(levels, 'after-ch4');
    const withNotebook = levels
      .filter(
        (level) => level.data.notebook !== undefined && save.levels[level.data.id] !== undefined,
      )
      .map((level) => level.data.id);
    expect(save.notebook).toEqual(withNotebook);
    expect(save.notebook.length).toBeGreaterThan(0);
    expect(save.tutorialsSeen.length).toBeGreaterThan(0);
  });

  it('after-ch7 has won the whole main path and no secret flower', () => {
    const save = savePoint(levels, 'after-ch7');
    expect(save.levels['7.5']).toBeDefined();
    expect(secretFlowers(entries, save, false).every((flower) => flower.state.kind !== 'won')).toBe(
      true,
    );
  });

  it('all-stars gathers the 134 stars, every seed, every cosmetic and the seven flowers won', () => {
    const save = savePoint(levels, 'all-stars');
    expect(totalStars(entries, save)).toBe(134);
    // One seed for the bet of 1.6 and one for each of the four doubling bets of 6.5.
    expect(seeds(save)).toBe(5);
    expect(openCosmetics({ stars: 134, seeds: seeds(save) }, false)).toEqual(
      openCosmetics({ stars: 0, seeds: 0 }, true),
    );
    expect(save.cosmeticsSeen).toEqual(openCosmetics({ stars: 0, seeds: 0 }, true));
    const flowers = secretFlowers(entries, save, false);
    expect(flowers).toHaveLength(7);
    expect(flowers.every((flower) => flower.state.kind === 'won')).toBe(true);
  });

  it('hub-flowers shows a flower won, one open, a bud and chapters with none', () => {
    const kinds = secretFlowers(entries, savePoint(levels, 'hub-flowers'), false).map(
      (flower) => flower.state.kind,
    );
    expect(kinds.slice(0, 3)).toEqual(['won', 'open', 'bud']);
    expect(kinds.slice(3).every((kind) => kind === 'none')).toBe(true);
  });

  it('names its points and nothing else', () => {
    expect(isSavePoint('after-ch4')).toBe(true);
    expect(isSavePoint('after-ch5')).toBe(false);
  });

  it('writes a console line that stores the save where the game reads it, and reloads', () => {
    const save = savePoint(levels, 'after-ch2');
    const line = consoleLine(save, SAVE_KEY);
    const store = memoryStore();
    let reloaded = false;
    new Function('localStorage', 'location', line)(store, { reload: () => (reloaded = true) });
    expect(reloaded).toBe(true);
    expect(loadSave(store)).toEqual(save);
  });
});
