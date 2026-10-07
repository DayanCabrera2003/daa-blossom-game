import { checkAugmentingPath } from '@core/matching/paths';
import { size } from '@core/matching/queries';
import { buildCounterexample, type Counterexample } from '@levels/counterexample';
import { counterexampleSchema } from '@levels/notebook';
import { describe, expect, it } from 'vitest';
import {
  handleCounterexample,
  openCounterexample,
  shownGarden,
  type CounterexampleController,
  type CounterexampleEvent,
} from './counterexampleController';

/** Six sprouts in a row, b=c and d=e lit: the chain a…f lights one lantern more. */
const rowOfSix = {
  line: 'ch1.5.sauce.01',
  sprouts: ['a', 'b', 'c', 'd', 'e', 'f'].map((label, i) => ({ label, x: 90 + 60 * i, y: 130 })),
  vines: [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'e'],
    ['e', 'f'],
  ],
  lanterns: [
    ['b', 'c'],
    ['d', 'e'],
  ],
};

const built = (json: unknown): Counterexample => {
  const result = buildCounterexample(counterexampleSchema.parse(json));
  if (!result.ok) throw new Error('the counterexample should build');
  return result.value;
};

const playable = built({ mode: 'play', ...rowOfSix, actions: ['join', 'split', 'chain'] });

/** The centre of sprout `k` of the row. */
const at = (k: number) => ({ x: 90 + 60 * k, y: 130 });

/** A drag from sprout `from` through each next sprout up to `to`. */
const drag = (from: number, to: number): CounterexampleEvent[] => [
  { kind: 'press', point: at(from) },
  ...Array.from({ length: to - from }, (_, k) => ({
    kind: 'move' as const,
    point: at(from + k + 1),
  })),
  { kind: 'release', point: at(to) },
];

/** Sends events in order, collecting every effect. */
const send = (controller: CounterexampleController, events: readonly CounterexampleEvent[]) => {
  let current = controller;
  const effects = [];
  for (const event of events) {
    const step = handleCounterexample(current, event);
    current = step.controller;
    effects.push(...step.effects);
  }
  return { controller: current, effects };
};

describe('the screen of a counterexample', () => {
  it('opens on its garden, holding its first tool, its sprouts where the file puts them', () => {
    const opened = openCounterexample(playable);
    expect(shownGarden(opened)).toBe(playable.start);
    expect(opened.pointer.tool).toBe('lanterns');
    expect(opened.positions).toEqual(rowOfSix.sprouts.map(({ x, y }) => ({ x, y })));
  });

  it('a chain dragged through all six sprouts lights exactly one lantern more', () => {
    const { controller, effects } = send(openCounterexample(playable), drag(0, 5));
    expect(effects).toEqual([
      expect.objectContaining({
        kind: 'animate',
        action: { type: 'chain', path: [0, 1, 2, 3, 4, 5] },
      }),
    ]);
    expect(size(shownGarden(controller).matching)).toBe(3);
  });

  it('a move the rules refuse is reported and changes nothing; there is no victory', () => {
    const opened = openCounterexample(playable);
    const { controller, effects } = send(opened, [
      { kind: 'press', point: at(0) },
      { kind: 'move', point: at(2) },
      { kind: 'release', point: at(2) },
    ]);
    expect(effects[0]).toMatchObject({
      kind: 'rejected',
      reason: { code: 'invalidPath', error: { code: 'notAdjacent' } },
      action: { type: 'chain', path: [0, 2] },
    });
    expect(shownGarden(controller)).toBe(playable.start);
    const lit = send(opened, [...drag(0, 5), { kind: 'press', point: at(0) }]);
    expect(lit.effects.some((effect) => effect.kind === 'rejected')).toBe(false);
  });

  it('a touch the rules refuse is reported with the move tried', () => {
    const chainsOnly = built({ mode: 'play', ...rowOfSix, actions: ['chain'] });
    const onVine = { x: 180, y: 130 };
    const tapped = send(openCounterexample(chainsOnly), [
      { kind: 'press', point: onVine },
      { kind: 'release', point: onVine },
    ]);
    expect(tapped.effects).toEqual([
      {
        kind: 'rejected',
        reason: { code: 'actionLocked', action: 'split' },
        action: { type: 'split', u: 1, v: 2 },
      },
    ]);
  });

  it('undo and redo go through the tries; another tool can be taken', () => {
    const chained = send(openCounterexample(playable), drag(0, 5)).controller;
    const undone = handleCounterexample(chained, { kind: 'undo' }).controller;
    expect(shownGarden(undone)).toBe(playable.start);
    const redone = handleCounterexample(undone, { kind: 'redo' }).controller;
    expect(size(shownGarden(redone).matching)).toBe(3);
    const marking = handleCounterexample(redone, { kind: 'tool', tool: 'marks' }).controller;
    expect(marking.pointer.tool).toBe('marks');
  });

  it('a garden to draw a reflection on takes no lantern moves: a touch on a vine draws it', () => {
    const drawn = built({ mode: 'mirrorDraw', ...rowOfSix, found: 'ch2.4.sauce.05' });
    const opened = openCounterexample(drawn);
    const dragged = send(opened, drag(0, 5));
    expect(dragged.effects).toEqual([]);
    expect(shownGarden(dragged.controller)).toBe(drawn.start);
    // The middle of the vine a–b, then of b–c: b would hold two silver lanterns.
    const touched = send(opened, [
      { kind: 'press', point: { x: 120, y: 130 } },
      { kind: 'release', point: { x: 120, y: 130 } },
      { kind: 'press', point: { x: 180, y: 130 } },
    ]);
    expect(touched.controller.challenge?.draft.mate).toEqual([1, 0, -1, -1, -1, -1]);
    expect(touched.effects).toEqual([
      { kind: 'drawRefused', reason: { code: 'twoSilver', vertex: 1 } },
    ]);
  });

  it('a mirrorDraw check finds a chain of its garden, and the mentor says its found line', () => {
    const drawn = built({ mode: 'mirrorDraw', ...rowOfSix, found: 'ch2.4.sauce.05' });
    const weak = send(openCounterexample(drawn), [
      { kind: 'drawToggle', u: 0, v: 1 },
      { kind: 'checkMirror' },
    ]);
    expect(weak.effects.map((effect) => effect.kind)).toEqual(['mirrorChecked']);
    const better = send(weak.controller, [
      { kind: 'drawToggle', u: 2, v: 3 },
      { kind: 'drawToggle', u: 4, v: 5 },
      { kind: 'checkMirror' },
    ]);
    const [checked, said] = better.effects;
    expect(said).toEqual({ kind: 'say', line: 'ch2.4.sauce.05' });
    expect(checked?.kind).toBe('mirrorChecked');
    if (checked?.kind !== 'mirrorChecked' || checked.check.kind !== 'better') return;
    const { graph, matching } = drawn.start;
    expect(checkAugmentingPath(graph, matching, checked.check.piece.sprouts).ok).toBe(true);
  });

  it('a garden to play takes no drawing', () => {
    const opened = openCounterexample(playable);
    expect(opened.challenge).toBeNull();
    for (const event of [{ kind: 'drawToggle', u: 0, v: 1 }, { kind: 'checkMirror' }] as const) {
      expect(handleCounterexample(opened, event)).toEqual({ controller: opened, effects: [] });
    }
  });
});
