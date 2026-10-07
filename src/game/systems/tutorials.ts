import type { ActionType } from '@core/rules/actions';
import type { Level } from '@levels/build';
import { compareLevelIds } from '@levels/catalog';
import { CARD_IDS, type CardId } from '@levels/cards/schema';
import type { LevelStep } from '@levels/flow';
import { isUiUnlocked } from '@levels/uiUnlocks';

/**
 * When each mechanic card shows (GDD §5.11): the first time its mechanic is open, once per player.
 * Tools and the sun are introduced as the level starts; the steps of a script (a bet, a question,
 * the notebook, the reflection, counting, drawing) when they are reached. Pure: the scene asks what
 * to show and the save remembers what was closed.
 */

/** The card that teaches each action. Actions done with one gesture share it. */
export const ACTION_CARD: Readonly<Record<ActionType, CardId>> = {
  join: 'lanterns',
  split: 'lanterns',
  passLantern: 'passLantern',
  chain: 'chain',
  declareDone: 'declareDone',
  inspect: 'inspect',
  markRoot: 'marks',
  markMoon: 'marks',
  placeScarecrow: 'scarecrows',
  removeScarecrow: 'scarecrows',
  fold: 'fold',
  foldAt: 'fold',
  unfold: 'unfold',
  rotateStem: 'rotateStem',
  liftStone: 'stones',
  dropStone: 'stones',
};

/**
 * The card a script step shows when it is reached; steps that ask for no new gesture have none.
 * The pond's three steps share one card: they are one scene, always together in chapter 2, and
 * the GDD names a single card for the reflection.
 */
export const STEP_CARD: Readonly<Partial<Record<LevelStep['step'], CardId>>> = {
  bet: 'bet',
  ask: 'question',
  notebook: 'notebook',
  mirror: 'reflection',
  explore: 'reflection',
  separate: 'reflection',
  count: 'count',
  draw: 'draw',
};

/**
 * Undo and redo are there from the first garden, but 0.1 lights a single lantern with nothing to
 * take back; their card waits for 0.2, the first garden where a move may want undoing.
 */
const UNDO_CARD_FROM = '0.2';

/** Cards in their listed order, without repeats. */
const inOrder = (cards: Iterable<CardId>): CardId[] => {
  const set = new Set(cards);
  return CARD_IDS.filter((card) => set.has(card));
};

/** The cards of what a level has open from its start: its tools, undo, the sun. */
export function levelCards(level: Level): CardId[] {
  const id = level.data.id;
  const tools = [...level.start.allowed].map((action) => ACTION_CARD[action]);
  const undo: CardId[] = compareLevelIds(id, UNDO_CARD_FROM) >= 0 ? ['undo'] : [];
  const sun: CardId[] = isUiUnlocked('sun', id) ? ['sun'] : [];
  return inOrder([...tools, ...undo, ...sun]);
}

/** The cards a level shows as it starts: what it has open that the player has not seen. */
export const startCards = (level: Level, seen: ReadonlySet<string>): CardId[] =>
  levelCards(level).filter((card) => !seen.has(card));

/**
 * The card shown as a step opens, unless seen. `kind` is the step, or the kind of any effect the
 * scene shows: the effect that opens a step has the step's name, and every other effect has none.
 */
export function stepCard(kind: string, seen: ReadonlySet<string>): CardId | null {
  const card = (STEP_CARD as Readonly<Record<string, CardId | undefined>>)[kind];
  return card === undefined || seen.has(card) ? null : card;
}

/**
 * Picks the cards to queue among `candidates`: those neither seen nor already offered, each once,
 * and the offered set with them added, so a card waiting its turn is not queued a second time.
 */
export function offerCards(
  offered: ReadonlySet<string>,
  candidates: readonly CardId[],
): { cards: CardId[]; offered: ReadonlySet<string> } {
  const cards = [...new Set(candidates)].filter((card) => !offered.has(card));
  return { cards, offered: new Set([...offered, ...cards]) };
}

/**
 * The cards the "?" button opens again: what the level has open from its start, and the cards of
 * the script steps reached so far (up to `reached`, the index of the current step).
 */
export function helpCards(level: Level, reached: number): CardId[] {
  const steps = level.flow.slice(0, reached + 1).map((step) => stepCard(step.step, new Set()));
  return inOrder([...levelCards(level), ...steps.filter((card) => card !== null)]);
}
