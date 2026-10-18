import strings from '@content/es/strings.json';
import { afterVictory } from '@game/systems/afterVictory';
import { EPILOGUE_LEVEL, epilogueReached } from '@game/systems/epilogue';
import { catalog } from '@levels/catalog';
import { codexSources, openCodex } from '@services/codexProgress';
import { catalogEntries, visibleLevels } from '@services/progress';
import { emptySave, recordCompletion } from '@services/save';
import { EPILOGUE_ENTRY, EPILOGUE_USES, epilogueChoices, paragraphsOf } from '@ui/model/epilogue';
import { describe, expect, it } from 'vitest';
import { MATHEMATICS } from './support/vocabulary';

/**
 * The epilogue "Más allá del jardín" on the real levels and texts (plan 07, phase 11): winning the
 * last garden leads to it with its page of the Codex open, every word it shows exists, the
 * author's closing note is written in paragraphs, and all of it speaks with the garden's words.
 */

const TABLE: Readonly<Record<string, string>> = strings;

/** Every key of `strings.json` the epilogue screen shows. */
const SHOWN = [
  'epilogue.title',
  'epilogue.lead',
  ...EPILOGUE_USES,
  'epilogue.author.title',
  'epilogue.author.closing',
  'epilogue.keys',
  ...epilogueChoices(new Map([['C14', new Set(['intuition'] as const)]]), {
    sandbox: true,
  }).map((button) => button.label),
];

describe('the words of the epilogue', () => {
  it('every text the epilogue shows is written, and none is empty', () => {
    const missing = SHOWN.filter((key) => !TABLE[key]?.trim());
    expect(missing).toEqual([]);
  });

  it('the author closes in four paragraphs', () => {
    expect(paragraphsOf(TABLE['epilogue.author.closing'] ?? '')).toHaveLength(4);
  });

  it('never names the mathematics: its version lives in the last entry of the Codex', () => {
    const offending = SHOWN.filter((key) => MATHEMATICS.test(TABLE[key] ?? ''));
    expect(offending).toEqual([]);
  });
});

describe('the way to the epilogue', () => {
  const levels = catalog();
  const shown = visibleLevels(catalogEntries(levels), false);

  it('its level is the last garden the player sees, and winning it leads there', () => {
    expect(shown.at(-1)?.id).toBe(EPILOGUE_LEVEL);
    expect(afterVictory(EPILOGUE_LEVEL, shown)).toEqual({ next: null, back: 'epilogue' });
  });

  it('winning it opens the page the epilogue offers to read, and the hub offers it again', () => {
    const won = recordCompletion(emptySave(), EPILOGUE_LEVEL, 3);
    const open = openCodex(codexSources(levels), won, false);
    expect(open.has(EPILOGUE_ENTRY)).toBe(true);
    expect(epilogueChoices(open, { sandbox: false }).map((button) => button.choice)).toEqual([
      'readCodex',
      'back',
    ]);
    expect(epilogueReached(won, false)).toBe(true);
  });

  it('no garden before it leads to the epilogue', () => {
    const before = shown
      .slice(0, -1)
      .filter((level) => afterVictory(level.id, shown).back !== 'hub');
    expect(before).toEqual([]);
  });
});
