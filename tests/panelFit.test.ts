import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import { CHAR_ADVANCE, estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { dialogueBox } from '../src/game/picture/dialogueBox';
import {
  innerWidth,
  NOTEBOOK_ICON,
  notebookLayout,
  QUESTION_PANEL,
  questionLayout,
  TUTORIAL_PANEL,
  tutorialLayout,
} from '../src/game/picture/panelLayout';
import { SETTINGS_PANEL } from '../src/game/picture/settingsPanelLayout';
import { charsIn, LINE_HEIGHT, textHeight, wrappedLines } from '../src/game/picture/textWrap';
import { questionAt, type Question, type QuestionOption } from '../src/game/systems/question';
import { DEMO_SIZE } from '../src/game/view/CardDemoView';
import { LAYOUT } from '../src/game/view/layout';
import { RACE_COUNTERS } from '../src/game/view/RaceView';
import { VICTORY_PANEL } from '../src/game/view/VictoryPanel';
import { CARD_IDS } from '../src/levels/cards/schema';
import { catalog } from '../src/levels/catalog';
import { createTranslator } from '../src/services/i18n';
import { createLines } from '../src/services/lines';

// Every text-heavy panel of the game fits where it is shown, in the pixel font (plan 06, phase 5):
// its texts are wrapped the way the engine wraps them (word by word, greedily) at the width the
// panel leaves, and the panel then ends above what it must not cover. A question and the notebook
// end above the dialogue box, since a hint can be said beside them; a card's window ends above
// the toolbar; the statement a counterexample answers stays in the top bar; a race's counters stay
// clear of its chart.

const t = createTranslator(strings);
const line = createLines(lines);
const levels = catalog();

/** An option in the player's words, as the presenter writes it. */
const optionText = (option: QuestionOption): string =>
  option.text !== undefined
    ? t(option.text)
    : option.line === null
      ? String(option.value)
      : line(option.line);

/** Every question of every level, with where it is asked. */
const questions: [string, Question][] = levels.flatMap((level) =>
  level.flow.flatMap((_, step): [string, Question][] => {
    const question = questionAt(level, step, level.start);
    return question === null ? [] : [[`${level.data.id} step ${step}`, question]];
  }),
);

/** The top of the dialogue box, which the panels of questions end above. */
const dialogueTop = dialogueBox(false).box.y;

describe('the panels fit their texts', () => {
  const inner = innerWidth(QUESTION_PANEL.width);

  it('there are questions of every kind to measure', () => {
    const kinds = new Set(questions.map(([, question]) => question.kind));
    expect([...kinds].sort()).toEqual(['ask', 'bet', 'count', 'notebook', 'raceBet']);
  });

  it.each(questions.filter(([, question]) => question.kind !== 'notebook'))(
    'the question of %s fits its panel, above the dialogue box',
    (_, question) => {
      const widths = question.options.map((option) => estimatedButtonWidth(optionText(option)));
      for (const width of widths) expect(width).toBeLessThanOrEqual(inner);
      const layout = questionLayout(textHeight(line(question.prompt), inner), widths);
      expect(QUESTION_PANEL.y + layout.height).toBeLessThanOrEqual(dialogueTop);
    },
  );

  it.each(questions.filter(([, question]) => question.kind === 'notebook'))(
    'the notebook of %s fits its page, above the dialogue box',
    (_, question) => {
      // The book, the notebook's name and what to do share the top row.
      const header = [t('notebook.title'), t('notebook.choose')].join('  ');
      expect([...header].length).toBeLessThanOrEqual(charsIn(inner - NOTEBOOK_ICON));
      const rows = question.options.map((option) => textHeight(optionText(option), inner - 6) + 4);
      const layout = notebookLayout(textHeight(line(question.prompt), inner), rows);
      expect(QUESTION_PANEL.y + layout.height).toBeLessThanOrEqual(dialogueTop);
    },
  );

  it.each(CARD_IDS)('the card %s fits its window, above the toolbar', (card) => {
    const width = innerWidth(TUTORIAL_PANEL.width);
    expect(wrappedLines(t(`tutorial.${card}.title`), charsIn(width))).toBe(1);
    const layout = tutorialLayout(textHeight(t(`tutorial.${card}.body`), width), DEMO_SIZE.height);
    expect(TUTORIAL_PANEL.y + layout.height).toBeLessThanOrEqual(LAYOUT.toolbarY - 1);
    expect(DEMO_SIZE.width).toBeLessThanOrEqual(width);
  });

  it("the free mode editor's card fits its window, above the toolbar", () => {
    const width = innerWidth(TUTORIAL_PANEL.width);
    expect(wrappedLines(t('sandbox.card.title'), charsIn(width))).toBe(1);
    // GDD §5.11: two or three lines about the gesture.
    expect(wrappedLines(t('sandbox.card.body'), charsIn(width))).toBeLessThanOrEqual(3);
    const layout = tutorialLayout(textHeight(t('sandbox.card.body'), width), DEMO_SIZE.height);
    expect(TUTORIAL_PANEL.y + layout.height).toBeLessThanOrEqual(LAYOUT.toolbarY - 1);
  });

  it('the statement a counterexample answers stays in the two lines of the top bar', () => {
    const statements = levels.flatMap((level) =>
      (level.data.notebook ?? []).flatMap((asked) =>
        asked.options.map((option) => `${line(asked.prompt)} ${line(option.line)}`),
      ),
    );
    expect(statements.length).toBeGreaterThan(0);
    const chars = charsIn(480 - 2 * LAYOUT.margin);
    for (const said of statements) {
      expect(LAYOUT.topY + wrappedLines(said, chars) * LINE_HEIGHT).toBeLessThanOrEqual(
        LAYOUT.garden.y + 1,
      );
    }
  });

  it('the settings panel fits its buttons and the labels of its rows', () => {
    const inner = innerWidth(SETTINGS_PANEL.width);
    for (const label of [t('settings.exportLog'), t('settings.close'), t('settings.mute')]) {
      expect(estimatedButtonWidth(label)).toBeLessThanOrEqual(inner);
    }
    // Each channel's name ends before its slider's track starts.
    for (const channel of ['music', 'sfx', 'voice']) {
      const name = SETTINGS_PANEL.pad + estimatedButtonWidth(t(`settings.${channel}`));
      expect(name).toBeLessThanOrEqual(SETTINGS_PANEL.track.from);
    }
    // The loudest percentage, written after its track, ends on the face, inside the wooden frame.
    const loudest = [...t('settings.volume', { percent: 100 })].length * CHAR_ADVANCE;
    const value = SETTINGS_PANEL.track.to + SETTINGS_PANEL.valueGap + loudest;
    expect(value).toBeLessThanOrEqual(SETTINGS_PANEL.width - SETTINGS_PANEL.frame.slices.right);
  });

  it('the victory panel of a free garden says its line on one row, in place of the stars', () => {
    expect(charsIn(VICTORY_PANEL.width - 2 * VICTORY_PANEL.pad)).toBeGreaterThanOrEqual(
      [...t('victory.free')].length,
    );
  });

  it("a race's counters stay clear of its chart, whatever they say", () => {
    const steps = 99_999;
    const counters = [
      t('race.counter.automaton', { steps }),
      t('race.counter.automatonDone', { steps }),
      t('race.counter.bruto', { steps }),
      t('race.counter.brutoDone', { steps }),
      t('race.counter.brutoAsleep'),
    ];
    for (const said of counters) {
      expect(wrappedLines(said, charsIn(RACE_COUNTERS.width))).toBeLessThanOrEqual(
        RACE_COUNTERS.rows,
      );
    }
  });
});
