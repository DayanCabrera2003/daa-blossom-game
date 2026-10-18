import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import { DIALOGUE_ROWS, dialogueBox } from '../src/game/picture/dialogueBox';
import { portraitOf } from '../src/game/picture/portrait';
import { charsIn, wrappedLines } from '../src/game/picture/textWrap';
import { SPEAKERS, speakerOf, type Speaker } from '../src/game/systems/speaker';
import { createTranslator } from '../src/services/i18n';

// Every line the dialogue box says fits it in the pixel font: wrapped at the width its speaker
// leaves for text (narrower beside a portrait) the way the engine wraps, word by word, greedily,
// it takes no more rows than the box has. So do the interface texts the mentor says there, with
// the longest values their parameters can take, and the names on the tab.

const t = createTranslator(strings);
const text = strings as Readonly<Record<string, string>>;

/** The keys of the interface texts that start with `prefix`. */
const keysOf = (prefix: string): string[] =>
  Object.keys(text).filter((key) => key.startsWith(prefix));

/** The interface texts the mentor says in the box, filled with every value they can take. */
function mentorTexts(): string[] {
  const runners = keysOf('raceBet.runner.').map((key) => t(key));
  const answers = keysOf('raceBet.answer.').map((key) => t(key));
  const reveals = runners.flatMap((runner) =>
    answers.flatMap((answer) =>
      answers.flatMap((bet) => [
        t('raceBet.revealRight', { runner, answer }),
        t('raceBet.revealWrong', { runner, answer, bet }),
      ]),
    ),
  );
  return [
    ...keysOf('hint.generic.').map((key) => t(key)),
    t('mirror.spared'),
    t('flower.spared'),
    // A bet and a count of two digits at most: no garden lights a hundred lanterns.
    t('bet.revealRight', { count: 99 }),
    t('bet.revealWrong', { bet: 99, count: 99 }),
    ...reveals,
  ];
}

/** Every text each speaker says in the box. */
function saidBy(speaker: Speaker): string[] {
  const written = Object.entries(lines)
    .filter(([id]) => speakerOf(id) === speaker)
    .map(([, line]) => line);
  return speaker === 'sauce' ? [...written, ...mentorTexts()] : written;
}

/** The rows the longest text of `speaker` takes in the box. */
const rowsOf = (speaker: Speaker): number => {
  const { text: room } = dialogueBox(portraitOf(speaker) !== null);
  return Math.max(...saidBy(speaker).map((said) => wrappedLines(said, charsIn(room.width))));
};

describe('dialogue lines fit their box', () => {
  it.each(SPEAKERS)('the longest line of %s fits the rows of the box', (speaker) => {
    expect(saidBy(speaker).length).toBeGreaterThan(0);
    expect(rowsOf(speaker)).toBeLessThanOrEqual(DIALOGUE_ROWS);
  });

  it('the mentor, beside his portrait, uses every row the box has', () => {
    expect(rowsOf('sauce')).toBe(DIALOGUE_ROWS);
  });

  it.each(SPEAKERS)('the name of %s fits the tab of the box', (speaker) => {
    const { tab } = dialogueBox(false);
    expect(charsIn(tab.width)).toBeGreaterThanOrEqual([...t(`speaker.${speaker}`)].length);
  });

  it('the hint to go on fits under the text, beside a portrait too', () => {
    const { text: room } = dialogueBox(true);
    expect(wrappedLines(t('dialogue.continue'), charsIn(room.width))).toBe(1);
  });
});
