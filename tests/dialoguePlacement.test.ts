import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import { invariant } from '../src/core/shared/invariant';
import { totalCoverage } from '../src/game/picture/coverage';
import { dialogueAvoidance, namedLabels } from '../src/game/picture/dialogueAvoidance';
import { panelAvoidance } from '../src/game/picture/panelAvoidance';
import { choosePanel } from '../src/game/picture/panelPlacement';
import { dialogueSpots } from '../src/game/picture/panelSpots';
import type { Rect } from '../src/game/picture/boxDistance';
import type { Avoidance } from '../src/game/picture/panelAvoidance';
import { handle, type Controller, type Effect } from '../src/game/systems/levelController';
import { stepNow } from '../src/game/systems/levelSession';
import { playWalkthrough } from '../src/game/systems/walkthrough';
import type { Level } from '../src/levels/build';
import { catalog } from '../src/levels/catalog';
import { createTranslator } from '../src/services/i18n';
import { createLines } from '../src/services/lines';
import strings from '../src/content/es/strings.json';
import { scriptMoments } from './support/panelMoments';
import { LAYOUT_PROPERTY_TIMEOUT } from './support/timeouts';

// Every run of lines the script says, and every hint, opens the dialogue box clear of the whole
// garden when some spot of the 480 × 270 canvas allows it, and else hides as little as any spot of
// the sprouts its lines name and of what the step and the hint light up.

const line = createLines(lines);
const t = createTranslator(strings);
/** An hour of the clock, in milliseconds: long enough for any hint to be on offer. */
const HOUR = 3_600_000;
const levels = catalog();

/** A run of lines of a level's script, with the garden as it is while they are said. */
interface Run {
  readonly texts: readonly string[];
  readonly controller: Controller;
}

/** Every run of lines a level's walkthrough says, each with the garden it is said over. */
function runsOf(level: Level): Run[] {
  const runs: Run[] = [];
  let said = 0;
  for (let played = 0; played <= level.walkthrough.length; played += 1) {
    const { controller, effects } = playWalkthrough({
      ...level,
      walkthrough: level.walkthrough.slice(0, played),
    });
    for (const effect of effects.slice(said)) {
      if (effect.kind === 'say') runs.push({ texts: effect.lines.map(line), controller });
    }
    said = effects.length;
  }
  return runs;
}

/** Whether `effect` is a run of lines. */
const isSay = (effect: Effect): boolean => effect.kind === 'say';

describe('the dialogue box over every garden of the catalog', () => {
  it('there are lines that name sprouts to keep in sight', () => {
    const naming = levels.flatMap((level) => {
      const labels = level.data.sprouts.map((sprout) => sprout.label);
      return runsOf(level).filter((run) => namedLabels(run.texts, labels).length > 0);
    });
    expect(naming.length).toBeGreaterThan(10);
  });

  it.each(levels.map((level) => [level.data.id, level] as const))(
    'in %s, each run of lines hides none of the garden if it can, else none of what it names',
    (_, level) => {
      const runs = runsOf(level);
      expect(runs.length).toBe(playWalkthrough(level).effects.filter(isSay).length);
      for (const { texts, controller } of runs) {
        const garden = panelAvoidance(controller);
        const avoid = dialogueAvoidance(garden, texts);
        const spots = dialogueSpots();
        const chosen = choosePanel(spots, avoid);
        const clear = spots.some((spot) => totalCoverage(spot, garden.shapes) === 0);
        if (clear) expect(totalCoverage(chosen, garden.shapes)).toBe(0);
        // Where no spot leaves all it names in sight (a garden spread over the whole canvas), the
        // box hides as little of it as any spot does.
        const least = Math.min(...spots.map((spot) => totalCoverage(spot, avoid.referred)));
        expect(totalCoverage(chosen, avoid.referred)).toBeLessThanOrEqual(least + 0.5);
      }
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );
});

/** The three hints of a level asked one after another where its first play step waits. */
function hintRunsOf(level: Level): Run[] {
  const moment = scriptMoments(level).find(
    ({ controller }) => stepNow(controller.session)?.step === 'play',
  );
  if (moment === undefined) return [];
  const runs: Run[] = [];
  let { controller } = moment;
  for (let grade = 1; grade <= 3; grade += 1) {
    const step = handle(controller, { kind: 'hint' }, grade * HOUR);
    controller = step.controller;
    for (const effect of step.effects) {
      if (effect.kind !== 'hint') continue;
      const { content } = effect;
      runs.push({ texts: [content.generic ? t(content.line) : line(content.line)], controller });
    }
  }
  return runs;
}

/** Where the dialogue box opens for `run`, and what it keeps clear of then. */
function placed(run: Run): { chosen: Rect; avoid: Avoidance } {
  const avoid = dialogueAvoidance(panelAvoidance(run.controller), run.texts);
  return { chosen: choosePanel(dialogueSpots(), avoid), avoid };
}

describe('the dialogue box saying the hints of every garden of the catalog', () => {
  it('there are hints, with what they light, to place', () => {
    const runs = levels.flatMap(hintRunsOf);
    expect(runs.length).toBeGreaterThan(100);
    expect(runs.some((run) => panelAvoidance(run.controller).referred.length > 0)).toBe(true);
  });

  it.each(levels.map((level) => [level.data.id, level] as const))(
    'in %s, each hint hides as little as any spot of what it lights and names',
    (_, level) => {
      for (const run of hintRunsOf(level)) {
        const { chosen, avoid } = placed(run);
        const least = Math.min(
          ...dialogueSpots().map((spot) => totalCoverage(spot, avoid.referred)),
        );
        expect(totalCoverage(chosen, avoid.referred)).toBeLessThanOrEqual(least + 0.5);
      }
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );
});

describe('the sprouts the box hid in the first-time playthrough', () => {
  /** The shapes of the sprouts `labels` of the garden of `controller`. */
  const shapesOf = (controller: Controller, labels: readonly string[]) =>
    labels.flatMap((label) => panelAvoidance(controller).sprouts?.get(label) ?? []);

  /** The hint of grade `grade` of level `id`, as the box says it. */
  function hintRun(id: string, grade: number): Run {
    const level = levels.find((candidate) => candidate.data.id === id);
    invariant(level !== undefined, `level ${id} exists`);
    const run = hintRunsOf(level)[grade - 1];
    invariant(run !== undefined, `level ${id} has a hint of grade ${grade}`);
    return run;
  }

  it('in 3.1, «R lleva toda la noche a oscuras» leaves R in sight', () => {
    const run = hintRun('3.1', 2);
    const { chosen } = placed(run);
    expect(totalCoverage(chosen, shapesOf(run.controller, ['R']))).toBe(0);
  });

  it('in 4.5, «Mira este farol» hides less of c and d than the box at the bottom did', () => {
    const run = hintRun('4.5', 2);
    const { chosen } = placed(run);
    const [bottom] = dialogueSpots();
    invariant(bottom !== undefined, 'the box has a home');
    const pointed = shapesOf(run.controller, ['c', 'd']);
    expect(totalCoverage(chosen, pointed)).toBeLessThan(totalCoverage(bottom, pointed));
  });
});
