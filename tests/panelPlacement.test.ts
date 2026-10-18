import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import { invariant } from '../src/core/shared/invariant';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { totalCoverage } from '../src/game/picture/coverage';
import {
  innerWidth,
  notebookLayout,
  QUESTION_PANEL,
  questionLayout,
  TUTORIAL_PANEL,
  tutorialLayout,
} from '../src/game/picture/panelLayout';
import { panelAvoidance } from '../src/game/picture/panelAvoidance';
import { choosePanel } from '../src/game/picture/panelPlacement';
import {
  cardSpots,
  dialogueSpots,
  notebookSpots,
  questionSpots,
  toastSpots,
} from '../src/game/picture/panelSpots';
import { toastBox } from '../src/game/picture/toastBox';
import type { Rect } from '../src/game/picture/boxDistance';
import type { Avoidance } from '../src/game/picture/panelAvoidance';
import { openController, type Controller } from '../src/game/systems/levelController';
import { DEMO_SIZE } from '../src/game/view/CardDemoView';
import { CARD_IDS } from '../src/levels/cards/schema';
import { GENERATORS, generate } from '../src/levels/sandbox/generators';
import { toPlayable } from '../src/levels/sandbox/toLevel';
import { textHeight } from '../src/game/picture/textWrap';
import type { Question, QuestionOption } from '../src/game/systems/question';
import { catalog } from '../src/levels/catalog';
import { createTranslator } from '../src/services/i18n';
import { createLines } from '../src/services/lines';
import { questionMoments, scriptMoments } from './support/panelMoments';
import { LAYOUT_PROPERTY_TIMEOUT } from './support/timeouts';

// Every panel over a garden opens where it hides none of what its step points at, whenever some
// spot allows it, and never hides more of the garden than where it always opened (the post-release
// fix of plan 09). The texts are measured the way `panelFit.test.ts` measures them.

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

/** The spots of a question's panel, measured as the view measures it. */
function spotsOf(question: Question) {
  const widths = question.options.map((option) => estimatedButtonWidth(optionText(option)));
  const prompt = line(question.prompt);
  const footer = t(
    question.kind === 'bet' || question.kind === 'raceBet' ? 'bet.choose' : 'question.choose',
  );
  const heightAt = (width: number): number => {
    const inner = innerWidth(width);
    const spot = { x: 0, y: 0, width };
    return questionLayout(textHeight(prompt, inner), widths, spot, textHeight(footer, inner))
      .height;
  };
  return questionSpots(heightAt, Math.max(...widths));
}

/** The spots of the notebook's page, measured as the view measures it. */
function notebookSpotsOf(question: Question) {
  const inner = innerWidth(QUESTION_PANEL.width);
  const rows = question.options.map((option) => textHeight(optionText(option), inner - 6) + 4);
  return notebookSpots(notebookLayout(textHeight(line(question.prompt), inner), rows).height);
}

/** Every question of the catalog, with the garden as it is when its panel opens. */
const moments = levels.flatMap((level) =>
  questionMoments(level).map((moment) => [`${level.data.id} step ${moment.step}`, moment] as const),
);

describe('the question of 2.2 about the thread through 1 (the author’s report)', () => {
  const level = levels.find((candidate) => candidate.data.id === '2.2');
  invariant(level !== undefined, 'level 2.2 exists');
  const moment = questionMoments(level).find((candidate) => candidate.step === 6);
  invariant(moment !== undefined, 'level 2.2 asks at step 6');
  const avoid = panelAvoidance(moment.controller);
  const spots = spotsOf(moment.question);

  it('is the question "Ahora el hilo. ¿Cuántos faroles tuyos tiene?"', () => {
    expect(moment.question.prompt).toBe('ch2.2.sauce.04');
  });

  it('where it always opened, it hid the thread it asks about', () => {
    const [home] = spots;
    invariant(home !== undefined, 'a question has a home');
    expect(totalCoverage(home, avoid.referred)).toBeGreaterThan(0);
  });

  it('now opens where the whole thread stays in sight', () => {
    const chosen = choosePanel(spots, avoid);
    expect(totalCoverage(chosen, avoid.referred)).toBe(0);
  });
});

describe('every question and notebook page of the catalog', () => {
  it('there are questions of every kind to place', () => {
    const kinds = new Set(moments.map(([, moment]) => moment.question.kind));
    expect([...kinds].sort()).toEqual(['ask', 'bet', 'count', 'notebook', 'raceBet']);
  });

  it.each(moments)(
    'the panel of %s hides none of what it points at, and no more of the garden than before',
    (_, moment) => {
      const avoid = panelAvoidance(moment.controller);
      const spots =
        moment.question.kind === 'notebook'
          ? notebookSpotsOf(moment.question)
          : spotsOf(moment.question);
      expect(totalCoverage(choosePanel(spots, avoid), avoid.referred)).toBe(0);
      expectClear(spots, avoid);
    },
  );
});

/** The tallest window of a mechanic card: the one with the longest body. */
const tallestCard = Math.max(
  ...CARD_IDS.map(
    (card) =>
      tutorialLayout(
        textHeight(t(`tutorial.${card}.body`), innerWidth(TUTORIAL_PANEL.width)),
        DEMO_SIZE.height,
      ).height,
  ),
);

/** A toast of a line of thirty letters, where it always showed. */
const toastHome = toastBox(30 * 6, 12);

/**
 * Whether the panel chosen among `spots` hides none of what the step points at when some spot
 * allows it (else as little as any spot), and no more of the garden than where it always opened
 * (its first spot) unless that spot hid what the step points at.
 */
function expectClear(spots: readonly Rect[], avoid: Avoidance): void {
  const [home] = spots;
  invariant(home !== undefined, 'a panel has a home');
  const chosen = choosePanel(spots, avoid);
  const least = Math.min(...spots.map((spot) => totalCoverage(spot, avoid.referred)));
  expect(totalCoverage(chosen, avoid.referred)).toBeLessThanOrEqual(least + 0.5);
  if (totalCoverage(home, avoid.referred) === 0) {
    expect(totalCoverage(chosen, avoid.shapes)).toBeLessThanOrEqual(
      totalCoverage(home, avoid.shapes) + 0.5,
    );
  }
}

/** The card's window, the dialogue box and a toast over the garden of `controller`. */
function expectEveryPanelClear(controller: Controller): void {
  const avoid = panelAvoidance(controller);
  expectClear(cardSpots(tallestCard), avoid);
  expectClear(dialogueSpots(), avoid);
  expectClear(toastSpots(toastHome), avoid);
}

describe('the card, the dialogue box and the toasts over every garden', () => {
  it.each(levels.map((level) => [level.data.id, level] as const))(
    'over %s, at every step of its script',
    (_, level) => {
      for (const { controller } of scriptMoments(level)) expectEveryPanelClear(controller);
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it.each(GENERATORS.map((generator) => [generator.id, generator] as const))(
    'over the gardens the free mode grows with %s',
    (_, generator) => {
      for (const size of [generator.min, generator.max]) {
        const { design } = generate(generator.id, size, 7);
        const level = toPlayable(design, ['join']);
        invariant(level.ok, 'a grown garden plays');
        expectEveryPanelClear(openController(level.value, 0).controller);
      }
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );
});
