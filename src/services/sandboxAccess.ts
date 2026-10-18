import type { ActionType } from '@core/rules/actions';
import { actionsUnlockedBy, UNLOCKED_AT } from '@core/rules/permissions';
import { compareLevelIds } from '@levels/catalog';
import type { CatalogEntry } from './progress';
import type { SaveData } from './save';

/**
 * What the free mode offers a player (plan 08, section 1.3), derived from the progress like the
 * open levels and never saved: whether it exists at all, the actions a designed garden is played
 * with, and which of the free mode's own orders are there.
 */
export interface SandboxAccess {
  /** Whether the free mode is offered in the hub: chapter 1 finished, or teacher mode. */
  readonly exists: boolean;
  /** The actions a garden of the free mode is played with. */
  readonly actions: readonly ActionType[];
  /** Whether the mechanical gardener solves the garden (after 6.2, where he is met). */
  readonly gardener: boolean;
  /** Whether the certificate offers scarecrows (after 3.8, where they certify a garden). */
  readonly scarecrows: boolean;
  /** Whether the certificate offers stones (after 7.4, where they certify a garden). */
  readonly stones: boolean;
  /**
   * The level whose pieces of the interface a garden shows (the sun, the layers, the Council's
   * count; `levels/uiUnlocks.ts`): the one its actions come from, so the screen opens no more
   * than the player has met.
   */
  readonly interfaceAt: string;
}

/** The chapter that opens the free mode once finished. */
const OPENING_CHAPTER = '1';

/** The level after which each order of the free mode is there. */
const GARDENER_AT = '6.2';
const SCARECROWS_AT = '3.8';
const STONES_AT = '7.4';

/** Every action of the game, in the order they are unlocked. */
const ALL_ACTIONS = Object.keys(UNLOCKED_AT) as ActionType[];

/** A level before every level, for a catalog with none: no piece of the interface is open at it. */
const BEFORE_ALL = '0.0';

/** The chapter of a level id: `1` for `1.10`. */
const chapterOf = (id: string): string => id.split('.')[0] ?? id;

/**
 * What the free mode offers for `save`. The levels that count are those of the game proper,
 * neither drafts nor secret flowers: finishing chapter 1 means winning every one of them. A garden
 * is played with the actions of the most advanced level won (a secret flower counts as the level
 * it is, inside its chapter), or of the first level when nothing is won yet (a shared link opened
 * before playing), and shows the interface of that same level. Teacher mode offers everything
 * (GDD §5.8), with the interface of the last level of the catalog.
 */
export function sandboxAccess(
  levels: readonly CatalogEntry[],
  save: SaveData,
  teacherMode: boolean,
): SandboxAccess {
  if (teacherMode) {
    const lastOfAll = levels
      .map((level) => level.id)
      .sort(compareLevelIds)
      .at(-1);
    return {
      exists: true,
      actions: ALL_ACTIONS,
      gardener: true,
      scarecrows: true,
      stones: true,
      interfaceAt: lastOfAll ?? BEFORE_ALL,
    };
  }
  const proper = levels.filter((level) => !level.draft && level.secret === undefined);
  const opening = proper.filter((level) => chapterOf(level.id) === OPENING_CHAPTER);
  const exists =
    opening.length > 0 && opening.every((level) => save.levels[level.id] !== undefined);
  const won = levels
    .filter((level) => !level.draft && save.levels[level.id] !== undefined)
    .map((level) => level.id)
    .sort(compareLevelIds);
  const last = won.at(-1);
  const furthest = last ?? proper[0]?.id ?? null;
  /** Whether the most advanced level won is `at` or beyond. */
  const past = (at: string): boolean => last !== undefined && compareLevelIds(last, at) >= 0;
  return {
    exists,
    actions: furthest === null ? [] : actionsUnlockedBy(furthest),
    gardener: past(GARDENER_AT),
    scarecrows: past(SCARECROWS_AT),
    stones: past(STONES_AT),
    interfaceAt: furthest ?? BEFORE_ALL,
  };
}
