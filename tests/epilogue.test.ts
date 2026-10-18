import strings from '@content/es/strings.json';
import { EPILOGUE_USES, epilogueChoices, paragraphsOf } from '@ui/model/epilogue';
import { describe, expect, it } from 'vitest';
import { MATHEMATICS } from './support/vocabulary';

/**
 * The epilogue "Más allá del jardín" on the real texts (plan 07, phase 11): every word it shows
 * exists, the author's closing note is written in paragraphs, and all of it speaks with the
 * garden's words.
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
