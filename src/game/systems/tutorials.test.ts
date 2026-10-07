import { UNLOCKED_AT } from '@core/rules/permissions';
import type { ActionType } from '@core/rules/actions';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import { catalog, compareLevelIds } from '@levels/catalog';
import { CARD_IDS, type CardId } from '@levels/cards/schema';
import { describe, expect, it } from 'vitest';
import {
  betrayalLevel,
  bloomLevel,
  festivalLevel,
  fivePetalsLevel,
  pentagonLevel,
  stemRotationLevel,
} from '../../../tests/support/fixtureLevels';
import {
  ACTION_CARD,
  helpCards,
  levelCards,
  offerCards,
  startCards,
  stepCard,
  STEP_CARD,
} from './tutorials';

const levels = catalog();
const levelOf = (id: string): Level => {
  const level = levels.find((candidate) => candidate.data.id === id);
  invariant(level !== undefined, `no level ${id}`);
  return level;
};

/**
 * Plays the game in order, as one player who closes every card: the cards each level shows, at
 * its start and as each step of its script is reached.
 */
function walkLevels(played: readonly Level[]): Map<string, CardId[]> {
  const seen = new Set<CardId>();
  const shown = new Map<string, CardId[]>();
  for (const level of played) {
    const cards = [...startCards(level, seen)];
    for (const card of cards) seen.add(card);
    for (const step of level.flow) {
      const card = stepCard(step.step, seen);
      if (card === null) continue;
      cards.push(card);
      seen.add(card);
    }
    shown.set(level.data.id, cards);
  }
  return shown;
}

/** The same walk, through the levels of the catalog with these ids. */
const walk = (ids: readonly string[]): Map<string, CardId[]> => walkLevels(ids.map(levelOf));

const playedInOrder = levels.filter((level) => !level.data.draft).map((level) => level.data.id);

describe('mechanic cards: when each one shows (GDD §5.11)', () => {
  const shown = walk(playedInOrder);

  it('each card shows once per player, however many levels use it', () => {
    const all = [...shown.values()].flat();
    expect(all).toEqual([...new Set(all)]);
  });

  it('the written chapters bring their mechanics in the levels that first use them', () => {
    expect(Object.fromEntries([...shown].filter(([, cards]) => cards.length > 0))).toEqual({
      '0.1': ['lanterns'],
      '0.2': ['undo'],
      '0.4': ['bet'],
      '0.5': ['sun'],
      '1.2': ['passLantern'],
      '1.3': ['chain'],
      '1.5': ['notebook'],
      '1.8': ['declareDone', 'question'],
      '2.1': ['reflection'],
      '2.2': ['count'],
      '2.4': ['draw'],
      '3.1': ['inspect', 'marks'],
      '3.7': ['scarecrows'],
      '4.2': ['pickVine'],
      '4.4': ['fold'],
      '4.5': ['unfold'],
      '4.10': ['rotateStem'],
    });
  });

  it('1.1 keeps passing the lantern closed, so its card waits for 1.2', () => {
    expect(levelCards(levelOf('1.1'))).not.toContain('passLantern');
    expect(levelCards(levelOf('1.2'))).toContain('passLantern');
  });

  it('1.6 does not bring the bet back to a player who saw it in 0.4', () => {
    expect(walk(['0.4', '1.6']).get('1.6')).not.toContain('bet');
    expect(walk(['1.6']).get('1.6')).toContain('bet');
  });

  it('a player who starts further on gets every card of what is open there, in order', () => {
    expect(startCards(levelOf('1.3'), new Set())).toEqual([
      'lanterns',
      'undo',
      'passLantern',
      'chain',
      'sun',
    ]);
  });

  it('gardens of later chapters bring the cards of their own tools', () => {
    // Chapters 0 to 2 as written, then gardens of chapters 4 and 7 that open new tools.
    const written = levels.filter(
      (level) => !level.data.draft && compareLevelIds(level.data.id, '3.0') < 0,
    );
    const later = walkLevels([
      ...written,
      festivalLevel(),
      fivePetalsLevel(),
      stemRotationLevel(),
      pentagonLevel(),
    ]);
    expect(later.get('4.1')).toEqual(['inspect', 'marks', 'scarecrows']);
    expect(later.get('4.6')).toEqual(['fold', 'unfold']);
    expect(later.get('4.10')).toEqual(['rotateStem']);
    expect(later.get('7.2')).toEqual(['stones']);
  });

  it('the first step that points at a vine brings its card (4.2), and only the first', () => {
    const written = levels.filter(
      (level) => !level.data.draft && compareLevelIds(level.data.id, '3.0') < 0,
    );
    const shown = walkLevels([...written, festivalLevel(), betrayalLevel()]);
    expect(shown.get('4.2')).toEqual(['pickVine']);
    expect(stepCard('pickVine', new Set())).toBe('pickVine');
    expect(stepCard('pickVine', new Set(['pickVine']))).toBeNull();
    expect(helpCards(betrayalLevel(), 1)).toContain('pickVine');
    expect(helpCards(betrayalLevel(), 0)).not.toContain('pickVine');
  });

  it('the flower challenge brings its card when it is reached (4.11), and only the first time', () => {
    expect(stepCard('flowerChallenge', new Set())).toBe('flowerChallenge');
    expect(stepCard('flowerChallenge', new Set(['flowerChallenge']))).toBeNull();
    expect(helpCards(bloomLevel(), 1)).toContain('flowerChallenge');
    expect(helpCards(bloomLevel(), 0)).not.toContain('flowerChallenge');
  });

  it('every action that unlocks has a card, and every card has something that shows it', () => {
    for (const action of Object.keys(UNLOCKED_AT) as ActionType[]) {
      expect(CARD_IDS).toContain(ACTION_CARD[action]);
    }
    const reachable = new Set<string>([
      ...Object.values(ACTION_CARD),
      ...Object.values(STEP_CARD),
      'undo',
      'sun',
    ]);
    expect(CARD_IDS.filter((card) => !reachable.has(card))).toEqual([]);
  });

  it('steps that ask no new gesture show no card', () => {
    expect(stepCard('say', new Set())).toBeNull();
    expect(stepCard('play', new Set())).toBeNull();
    expect(stepCard('replay', new Set())).toBeNull();
    expect(stepCard('bet', new Set(['bet']))).toBeNull();
    expect(stepCard('explore', new Set())).toBe('reflection');
    expect(stepCard('animate', new Set())).toBeNull();
  });

  it('offering cards skips those seen or already waiting, and remembers the new ones', () => {
    const { cards, offered } = offerCards(new Set(['sun']), ['lanterns', 'sun', 'lanterns']);
    expect(cards).toEqual(['lanterns']);
    expect([...offered].sort()).toEqual(['lanterns', 'sun']);
  });
});

describe('the "?" button: the cards of what is open in the level', () => {
  it('lists the tools of the level, and the steps of its script reached so far', () => {
    const level = levelOf('1.8');
    expect(helpCards(level, 0)).toEqual([
      'lanterns',
      'undo',
      'passLantern',
      'chain',
      'sun',
      'declareDone',
    ]);
    const asking = level.flow.findIndex((step) => step.step === 'ask');
    expect(helpCards(level, asking)).toContain('question');
    expect(helpCards(level, level.flow.length)).toContain('question');
  });

  it('in the first garden it shows just the lanterns', () => {
    expect(helpCards(levelOf('0.1'), 0)).toEqual(['lanterns']);
  });
});
