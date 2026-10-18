// The synthetic saves of the author's kit (plan 09, phase 11): named points of the game to load
// in a browser for a playtest that starts halfway, a review on screen or the recording of the
// video, derived from the catalog so they follow the levels as they are. Pure: `make-save.ts`
// prints them.
import { levelCards } from '@game/systems/tutorials';
import type { Level } from '@levels/build';
import { starsCeiling } from '@levels/starsCeiling';
import { openCosmetics } from '@services/cosmetics';
import { catalogEntries } from '@services/progress';
import {
  emptySave,
  recordBetsWon,
  recordCompletion,
  recordCosmeticsSeen,
  recordNotebook,
  recordTutorialSeen,
  type SaveData,
} from '@services/save';
import { seeds } from '@services/seeds';
import { totalStars } from '@services/starCount';

/** The points a save can be made for, in the order of the game. */
export const SAVE_POINTS = [
  'fresh',
  'after-ch2',
  'after-ch4',
  'after-ch6',
  'after-ch7',
  'all-stars',
  'hub-flowers',
] as const;

/** A point of the kit. */
export type SavePoint = (typeof SAVE_POINTS)[number];

/** Whether a name is one of the points. */
export const isSavePoint = (name: string): name is SavePoint =>
  SAVE_POINTS.some((point) => point === name);

/** The chapter of a level, as a number. */
const chapterOf = (level: Level): number => Number(level.data.id.split('.')[0]);

/** Whether a level is on the main path: neither a draft nor a secret flower. */
const onMainPath = (level: Level): boolean => !level.data.draft && level.data.secret === undefined;

/**
 * The bets a level wins when every one is answered right, named as the save keeps them
 * (`1.6#3`, `systems/betsWon.ts`): its formal bet and each doubling bet of its races.
 */
const betsOf = (level: Level): string[] =>
  level.data.flow.flatMap((step, index) =>
    step.step === 'raceBet' || (step.step === 'bet' && !step.informal)
      ? [`${level.data.id}#${index}`]
      : [],
  );

/**
 * The save of a player who has won `won` in catalog order, each with the stars `starsFor` gives
 * it: the notebook written where a level has one, the mechanic cards of each level seen, the bets
 * of the levels won with every star answered right (the bet of a level won with fewer stars than
 * it can give is taken as lost), and the cosmetics the stars and seeds bring already announced, as
 * a player who walked there would have them.
 */
function saveOf(
  levels: readonly Level[],
  won: readonly Level[],
  starsFor: (level: Level) => number,
): SaveData {
  let save = emptySave();
  for (const level of won) {
    const stars = starsFor(level);
    save = recordCompletion(save, level.data.id, stars);
    if (level.data.notebook !== undefined) save = recordNotebook(save, level.data.id);
    for (const card of levelCards(level)) save = recordTutorialSeen(save, card);
    if (stars === starsCeiling(level.data)) save = recordBetsWon(save, betsOf(level));
  }
  const stars = totalStars(catalogEntries(levels), save);
  return recordCosmeticsSeen(save, openCosmetics({ stars, seeds: seeds(save) }, false));
}

/** Every star a level can give. */
const allStars = (level: Level): number => starsCeiling(level.data);

/** The main path up to the end of `chapter`, every level with all its stars. */
const afterChapter = (levels: readonly Level[], chapter: number): SaveData =>
  saveOf(
    levels,
    levels.filter((level) => onMainPath(level) && chapterOf(level) <= chapter),
    allStars,
  );

/**
 * The secret flowers of the hub each in another state: chapters 0 to 3 finished, 1 with all its
 * stars and its flower won, 2 with all its stars and its flower open, 3 with a single star each, too
 * few, so its flower is a bud; the later chapters unfinished, with no flower.
 */
function hubFlowers(levels: readonly Level[]): SaveData {
  const won = levels.filter(
    (level) =>
      (onMainPath(level) && chapterOf(level) <= 3) ||
      (level.data.secret !== undefined && chapterOf(level) === 1),
  );
  return saveOf(levels, won, (level) => (chapterOf(level) === 3 ? 1 : allStars(level)));
}

/** The save of a point of the kit, from the catalog `levels` (in catalog order). */
export function savePoint(levels: readonly Level[], point: SavePoint): SaveData {
  switch (point) {
    case 'fresh':
      return emptySave();
    case 'after-ch2':
      return afterChapter(levels, 2);
    case 'after-ch4':
      return afterChapter(levels, 4);
    case 'after-ch6':
      return afterChapter(levels, 6);
    case 'after-ch7':
      return afterChapter(levels, 7);
    case 'all-stars':
      return saveOf(
        levels,
        levels.filter((level) => !level.data.draft),
        allStars,
      );
    case 'hub-flowers':
      return hubFlowers(levels);
  }
}

/**
 * The line to paste in the browser's console on the game's page: it writes the save where the
 * game keeps it and reloads, so the game opens at that point.
 */
export const consoleLine = (save: SaveData, key: string): string =>
  `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(save))}); location.reload();`;
