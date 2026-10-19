import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { MAX_SPROUTS } from '../src/levels/sandbox/limits';
import { catalog } from '../src/levels/catalog';
import { isUiUnlocked } from '../src/levels/uiUnlocks';
import { CHAR_ADVANCE, estimatedButtonWidth, hudRow } from '../src/game/picture/bottomRows';
import { statusEnd, statusLine } from '../src/game/picture/statusLine';
import { generateDrawer } from '../src/game/picture/generateDrawer';
import { charsIn, LINE_HEIGHT, wrappedLines } from '../src/game/picture/textWrap';
import { TOAST, toastBox } from '../src/game/picture/toastBox';
import { GENERATORS } from '../src/levels/sandbox/generators';
import { racesOf } from '../src/levels/races';
import { costChart } from '../src/game/picture/costChart';
import { PIXEL_FONT } from '../src/game/picture/pixelFont';
import { RACE_CHART, RACE_LAYOUT } from '../src/game/view/RaceView';
import { backLeft, CREDITS_ROLL } from '../src/game/picture/creditsRoll';
import { CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { LAYOUT } from '../src/game/view/layout';
import manifest from '../src/game/assets/manifest.json';
import { createTranslator } from '../src/services/i18n';

// The bars and rows of the screens that place their texts and buttons from measured widths, not
// from coordinates fitted to some words: with the real words of the game, in the pixel font,
// nothing is drawn over anything else. Panels with a frame of their own are in panelFit.test.ts.

const t = createTranslator(strings);
const levels = catalog();

/** The water drop of the pack before the water spent, drawn at its own size. */
const WATER_DROP_WIDTH = manifest.assets['icon.water'].image.width;

/** How wide a line of text is drawn in the monospaced pixel font. */
const widthOf = (text: string): number => [...text].length * CHAR_ADVANCE;

/** The least air between two texts on one line: the dark outline each wears, a pixel a side. */
const AIR = 2;

/** A span of a line, from `x0` to `x1`. */
interface Span {
  readonly x0: number;
  readonly x1: number;
}

/** Whether two spans of a line keep at least `AIR` between them. */
const apart = (a: Span, b: Span): boolean => a.x1 + AIR <= b.x0 || b.x1 + AIR <= a.x0;

/** The widest of some texts. */
const widest = (texts: readonly string[]): number => Math.max(0, ...texts.map(widthOf));

/** What a level's HUD can show on its two text lines at worst, widest first. */
interface HudWords {
  readonly name: string;
  readonly goals: readonly string[];
  readonly sun: boolean;
  /** The status line's left part, as its parts: lanterns, then water, then the layers. */
  readonly lanterns: string;
  readonly water: { readonly full: string; readonly short: string } | null;
  readonly layer: string | null;
  readonly prompts: readonly string[];
  readonly councils: readonly string[];
}

/** The steps of a script that write what they wait for on the status line. */
const PROMPT_STEPS = ['sun', 'explore', 'separate', 'draw'];

/** The widest words the HUD can show for a garden of `n` sprouts as from level `at`. */
function wordsFor(
  name: string,
  n: number,
  at: string,
  goals: readonly string[],
  water: HudWords['water'],
  prompts: readonly string[],
  fog: boolean,
): HudWords {
  const most = Math.floor(n / 2);
  const council = isUiUnlocked('council', at)
    ? [
        t('hud.council', { groups: n, stones: n, atLeast: n, dark: n }),
        ...(fog ? [t('hud.councilHidden')] : []),
      ]
    : [];
  return {
    name,
    goals: [...goals, t('hud.mirror', { yours: most, mirror: most })],
    sun: isUiUnlocked('sun', at),
    lanterns: t('hud.lanterns', { count: most }),
    water,
    // A flower nests in at least three sprouts, so a garden is at most n / 3 flowers deep.
    layer: isUiUnlocked('layers', at) ? t('hud.layer', { depth: Math.floor(n / 3) }) : null,
    prompts,
    councils: council,
  };
}

/** Every level of the catalog, and a free garden at the editor's limit with all the interface. */
const huds: HudWords[] = [
  ...levels.map(({ data }) => {
    const n = data.sprouts.length;
    const goals = data.goal.visible
      ? [t('hud.goal', { count: data.goal.value })]
      : [t('hud.goalHidden'), t('hud.bet', { count: n })];
    // Without a budget the water spent is told alone; a drop per sprout and vine is far more
    // than any search spends, two digits at most.
    const water =
      data.water !== null
        ? {
            full: t('hud.water', { used: data.water, budget: data.water }),
            short: t('hud.waterShort', { used: data.water, budget: data.water }),
          }
        : data.fog
          ? {
              full: t('hud.waterNoBudget', { used: 99 }),
              short: t('hud.waterNoBudgetShort', { used: 99 }),
            }
          : null;
    const prompts = PROMPT_STEPS.filter((step) => data.flow.some((s) => s.step === step)).map(
      (step) => t(`hud.prompt.${step}`),
    );
    return wordsFor(data.id, n, data.id, goals, water, prompts, data.fog);
  }),
  wordsFor(
    'a free garden',
    MAX_SPROUTS,
    '7.5',
    [t('hud.goal', { count: MAX_SPROUTS / 2 })],
    null,
    [],
    false,
  ),
];

describe("the HUD's two lines of text", () => {
  it.each(huds.map((hud) => [hud.name, hud] as const))(
    'the goal of %s ends before the sun on the top line',
    (_, hud) => {
      const end = LAYOUT.margin + widest(hud.goals);
      // The sun's knob, at the left end of its track, reaches six pixels before it.
      const sun = hud.sun ? LAYOUT.sunTrack.x0 - 6 : CANVAS_WIDTH - LAYOUT.margin;
      expect(end + AIR).toBeLessThanOrEqual(sun);
    },
  );

  it.each(huds.map((hud) => [hud.name, hud] as const))(
    'the status line of %s: lanterns, water and layers, the prompt and the Council apart',
    (_, hud) => {
      // Each prompt with each count of the Council, or alone: the left part laid out before them
      // as the HUD lays it out, then checked against both.
      const prompts = hud.prompts.length === 0 ? [''] : hud.prompts;
      const councils = hud.councils.length === 0 ? [''] : hud.councils;
      for (const prompt of prompts) {
        for (const council of councils) {
          const p = widthOf(prompt);
          const c = widthOf(council);
          const lanterns = widthOf(hud.lanterns);
          const water =
            hud.water === null
              ? null
              : { full: widthOf(hud.water.full), short: widthOf(hud.water.short) };
          const layer = hud.layer === null ? null : widthOf(hud.layer);
          const at = statusLine(
            { start: LAYOUT.margin, lanterns, drop: WATER_DROP_WIDTH, water, layer },
            statusEnd(p, c),
          );
          const end =
            at.layer !== null && layer !== null
              ? at.layer + layer
              : at.water !== null && water !== null
                ? at.water + (at.short ? water.short : water.full)
                : LAYOUT.margin + lanterns;
          const left: Span = { x0: LAYOUT.margin, x1: end };
          const right = CANVAS_WIDTH - LAYOUT.margin;
          if (p > 0)
            expect(apart(left, { x0: (CANVAS_WIDTH - p) / 2, x1: (CANVAS_WIDTH + p) / 2 })).toBe(
              true,
            );
          if (c > 0) expect(apart(left, { x0: right - c, x1: right })).toBe(true);
          expect(end).toBeLessThanOrEqual(right);
        }
      }
      // The prompt in the middle and the Council at the right keep apart too.
      for (const prompt of hud.prompts) {
        const w = widthOf(prompt);
        const centred: Span = { x0: (CANVAS_WIDTH - w) / 2, x1: (CANVAS_WIDTH + w) / 2 };
        for (const council of hud.councils) {
          const right = CANVAS_WIDTH - LAYOUT.margin;
          expect(apart(centred, { x0: right - widthOf(council), x1: right })).toBe(true);
        }
      }
    },
  );
});

describe("the counterexample's bottom row", () => {
  it.each(['counterexample.back', 'counterexample.backToQuestion'] as const)(
    'lays its buttons right to left and keeps them clear of the count of lanterns (%s)',
    (way) => {
      const labels = [t(way), t('hud.redo'), t('hud.undo'), t('hud.checkMirror')];
      const widths = labels.map((label) => estimatedButtonWidth(label));
      const lefts = hudRow(widths);
      // No button touches the next.
      lefts.forEach((left, i) => {
        const next = lefts[i + 1];
        if (next !== undefined) expect(next + (widths[i + 1] ?? 0)).toBeLessThanOrEqual(left);
      });
      // The count at the left, the widest it can be with two digits, ends before the last button.
      const count = widest([
        t('hud.lanterns', { count: 99 }),
        t('hud.mirror', { yours: 99, mirror: 99 }),
      ]);
      expect(LAYOUT.margin + count + AIR).toBeLessThanOrEqual(Math.min(...lefts));
    },
  );
});

/** The top of the free mode's generate drawer, with the real words, the size at its widest. */
const drawerTop = (): number =>
  generateDrawer({
    generators: GENERATORS.map((generator) => estimatedButtonWidth(t(generator.textKey))),
    smaller: estimatedButtonWidth(t('sandbox.gen.smaller')),
    size: widthOf(t('sandbox.gen.size', { size: 20 })),
    larger: estimatedButtonWidth(t('sandbox.gen.larger')),
    another: estimatedButtonWidth(t('sandbox.gen.another')),
    done: estimatedButtonWidth(t('sandbox.gen.done')),
  }).panel.y;

describe('the toasts', () => {
  /** A parameter filled the widest way: the longest action, or two letters for a name or count. */
  const longestAction = Object.keys(strings)
    .filter((key) => key.startsWith('action.'))
    .map((key) => t(key))
    .reduce((a, b) => (a.length >= b.length ? a : b), '');
  const filled = (key: string): string => {
    const params: Record<string, string> = {};
    for (const [, name] of (strings as Record<string, string>)[key]?.matchAll(/\{(\w+)\}/g) ?? [])
      params[name ?? ''] = name === 'action' ? longestAction : 'XX';
    return t(key, params);
  };
  /**
   * Everything a toast says: refusals, why a claim falls short, the mirror's check, the free mode's
   * notices.
   */
  const messages = Object.keys(strings)
    .filter(
      (key) =>
        key.startsWith('reason.') ||
        key.startsWith('claim.') ||
        key.startsWith('sandbox.reason.') ||
        key.startsWith('sandbox.opened.') ||
        [
          'mirror.notBetter',
          'mirror.chain',
          'mirror.again',
          'sandbox.certify.notYet',
          'sandbox.certify.notYetGardener',
          'sandbox.certify.notBees',
          'share.done',
          'sandbox.gen.shrunk',
          'sandbox.unplayable',
        ].includes(key),
    )
    .map((key) => [key, filled(key)] as const);

  it('there are messages of every kind to measure', () => {
    expect(messages.length).toBeGreaterThan(40);
  });

  it.each(messages)('%s stays between the top bar and the toolbar', (_, message) => {
    const lines = wrappedLines(message, charsIn(TOAST.wrap));
    const box = toastBox(Math.min(TOAST.wrap, widthOf(message)), lines * LINE_HEIGHT);
    expect(box.y).toBeGreaterThanOrEqual(LAYOUT.garden.y);
    expect(box.y + box.height).toBeLessThan(LAYOUT.toolbarY - 1);
  });

  it.each(messages)('%s stays above the generate drawer, under the top bar', (_, message) => {
    const lines = wrappedLines(message, charsIn(TOAST.wrap));
    const top = drawerTop();
    const box = toastBox(
      Math.min(TOAST.wrap, widthOf(message)),
      lines * LINE_HEIGHT,
      top - TOAST.aboveDrawer,
    );
    expect(box.y).toBeGreaterThanOrEqual(LAYOUT.garden.y);
    expect(box.y + box.height).toBeLessThan(top);
  });
});

describe("the race chart's words", () => {
  const { at } = RACE_CHART;
  const { width, height } = RACE_LAYOUT.chart;
  /** The panel's right edge, inside its border. */
  const panelRight = CANVAS_WIDTH - 4 - 1;
  /**
   * The rows a line of text written at `y` inks, outline included: from a pixel over its tallest
   * letters (a capital, a digit, b, d, t) to a pixel under its baseline, or under its tails.
   */
  const rows = (y: number, text: string): Span => ({
    x0: y + PIXEL_FONT.ascent - PIXEL_FONT.capHeight - 1,
    x1: y + PIXEL_FONT.ascent + (/[gjpqy,;]/.test(text) ? PIXEL_FONT.descent : 0) + 1,
  });
  /** Whether two spans overlap at all (touching ends do not). */
  const overlap = (a: Span, b: Span): boolean => a.x0 < b.x1 && b.x0 < a.x1;

  it("the automaton's name ends before Bruto's dot, and Bruto's on the panel", () => {
    const [automaton, bruto] = RACE_CHART.legendX(width);
    const automatonEnd =
      at.x + automaton + RACE_CHART.legendDotRoom + widthOf(t('race.legend.automaton'));
    // Bruto's dot is drawn two pixels round a point two pixels after where his legend starts.
    expect(automatonEnd).toBeLessThanOrEqual(at.x + bruto);
    const brutoEnd = at.x + bruto + RACE_CHART.legendDotRoom + widthOf(t('race.legend.bruto'));
    expect(brutoEnd).toBeLessThanOrEqual(panelRight);
  });

  const charts = levels.flatMap((level) => {
    const races = racesOf(level.flow).map(({ result }) => result);
    return races.length === 0
      ? []
      : [[level.data.id, costChart(races, races.length, { width, height })] as const];
  });

  it('there are races to measure', () => {
    expect(charts.length).toBeGreaterThanOrEqual(2);
  });

  it.each(charts)('in %s, the sizes stand apart under the axis, clear of its name', (_, chart) => {
    const sizeY = at.y + height + RACE_CHART.size.dy;
    const sizes = chart.sizes.map(({ n, x }) => {
      const x0 = at.x + x + RACE_CHART.size.dx;
      return { x0, x1: x0 + widthOf(String(n)), text: String(n) };
    });
    sizes.forEach((size, i) => {
      const next = sizes[i + 1];
      if (next !== undefined) expect(apart(size, next)).toBe(true);
      expect(size.x1).toBeLessThanOrEqual(panelRight);
    });
    // The axis's name under the sizes: where they share columns, they share no row.
    const name = t('race.axis.sprouts');
    const nameX = at.x + width - RACE_CHART.sprouts.fromRight;
    const nameY = at.y + height + RACE_CHART.sprouts.dy;
    expect(nameX + widthOf(name)).toBeLessThanOrEqual(panelRight);
    for (const size of sizes) {
      if (!overlap(size, { x0: nameX, x1: nameX + widthOf(name) })) continue;
      expect(overlap(rows(sizeY, size.text), rows(nameY, name))).toBe(false);
    }
    // The sizes' row starts under the axis line.
    expect(rows(sizeY, '0').x0).toBeGreaterThan(at.y + height);
  });

  it("the name of the steps keeps clear of the legend's row over it", () => {
    const stepsY = at.y + RACE_CHART.steps.dy;
    const legendY = at.y + RACE_CHART.legendDy;
    const steps = t('race.axis.steps');
    expect(overlap(rows(stepsY, steps), rows(legendY, t('race.legend.automaton')))).toBe(false);
  });
});

describe("the credits' way back", () => {
  it("ends at the panel's right edge, under it and on the canvas, with its real words", () => {
    const width = estimatedButtonWidth(t('credits.back'));
    const { panel } = CREDITS_ROLL;
    const left = backLeft(width);
    expect(left).toBeGreaterThanOrEqual(panel.x);
    expect(left - 2 + width).toBeLessThanOrEqual(CANVAS_WIDTH);
  });
});
