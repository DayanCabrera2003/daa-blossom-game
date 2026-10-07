import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { reactionsTo, type Reaction } from './reactions';

/**
 * A garden in the style of 1.4 (GDD): A in the dark; branch 1 `A–B=C–D=E`, with E a dead end;
 * branch 2 `A–F=G–H`, with H in the dark. Three lanterns lit, four fit.
 */
const alley = (): Level => {
  const loaded = loadLevel({
    id: '1.4',
    sprouts: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, i) => ({
      label,
      x: 40 + 50 * i,
      y: 135,
    })),
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'E'],
      ['A', 'F'],
      ['F', 'G'],
      ['G', 'H'],
    ],
    lanterns: [
      ['B', 'C'],
      ['D', 'E'],
      ['F', 'G'],
    ],
    goal: { visible: true, value: 4 },
    victory: { type: 'matchingSize', value: 4 },
    solution: [{ type: 'chain', path: ['A', 'F', 'G', 'H'] }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

/** The dead-end chain A…E (gain 0) and the chain A…H that lights a new lantern. */
const deadEnd: Action = { type: 'chain', path: [0, 1, 2, 3, 4] };
const lucky: Action = { type: 'chain', path: [0, 5, 6, 7] };

/** The garden after an accepted move. */
const after = (state: GardenState, action: Action): GardenState => {
  const outcome = applyAction(state, action);
  if (!outcome.ok) throw new Error(`move refused: ${outcome.reason.code}`);
  return outcome.state;
};

const gainZero: Reaction = { on: 'gainZeroChain', say: ['ch1.4.sauce.01'] };
const atTwo: Reaction = { on: 'lanterns', value: 2, say: ['ch1.4.sauce.02', 'ch1.4.sauce.03'] };

describe('the reactions of a play step', () => {
  it('a chain that lights nothing new fires the gain-zero reaction, with its lines', () => {
    const start = alley().start;
    const turn = reactionsTo({ step: 1, reactions: [gainZero] }, [], {
      action: deadEnd,
      before: start,
      after: after(start, deadEnd),
    });
    expect(turn).toEqual({ fired: [{ step: 1, reaction: 0 }], lines: ['ch1.4.sauce.01'] });
  });

  it('a chain that lights a new lantern does not fire the gain-zero reaction', () => {
    const start = alley().start;
    const turn = reactionsTo({ step: 0, reactions: [gainZero] }, [], {
      action: lucky,
      before: start,
      after: after(start, lucky),
    });
    expect(turn).toEqual({ fired: [], lines: [] });
  });

  it('only a chain is a gain-zero chain: other moves that keep the count fire nothing', () => {
    const start = alley().start;
    const pass: Action = { type: 'passLantern', from: 0, to: 1 };
    const turn = reactionsTo({ step: 0, reactions: [gainZero] }, [], {
      action: pass,
      before: start,
      after: after(start, pass),
    });
    expect(turn).toEqual({ fired: [], lines: [] });
  });

  it('a reaction already fired never fires again', () => {
    const start = alley().start;
    const fired = [{ step: 0, reaction: 0 }];
    const turn = reactionsTo({ step: 0, reactions: [gainZero] }, fired, {
      action: deadEnd,
      before: start,
      after: after(start, deadEnd),
    });
    expect(turn).toEqual({ fired, lines: [] });
  });

  it('a reaction fired in another play step is another reaction', () => {
    const start = alley().start;
    const turn = reactionsTo({ step: 2, reactions: [gainZero] }, [{ step: 0, reaction: 0 }], {
      action: deadEnd,
      before: start,
      after: after(start, deadEnd),
    });
    expect(turn.lines).toEqual(['ch1.4.sauce.01']);
    expect(turn.fired).toEqual([
      { step: 0, reaction: 0 },
      { step: 2, reaction: 0 },
    ]);
  });

  it('a lanterns reaction fires when a move brings the garden to exactly that many', () => {
    const start = alley().start;
    const split: Action = { type: 'split', u: 1, v: 2 };
    const two = after(start, split);
    const turn = reactionsTo({ step: 0, reactions: [atTwo] }, [], {
      action: split,
      before: start,
      after: two,
    });
    expect(turn).toEqual({
      fired: [{ step: 0, reaction: 0 }],
      lines: ['ch1.4.sauce.02', 'ch1.4.sauce.03'],
    });
    // A move that leaves the count where it was reaches nothing.
    const stay: Action = { type: 'passLantern', from: 2, to: 3 };
    expect(
      reactionsTo({ step: 0, reactions: [atTwo] }, [], {
        action: stay,
        before: two,
        after: after(two, stay),
      }).lines,
    ).toEqual([]);
  });

  it('several reactions of one move say their lines in the order the level writes them', () => {
    const start = alley().start;
    const atFour = (line: string): Reaction => ({ on: 'lanterns', value: 4, say: [line] });
    const reactions = [atFour('ch1.4.sauce.04'), gainZero, atFour('ch1.4.sauce.05')];
    const turn = reactionsTo({ step: 0, reactions }, [], {
      action: lucky,
      before: start,
      after: after(start, lucky),
    });
    expect(turn).toEqual({
      fired: [
        { step: 0, reaction: 0 },
        { step: 0, reaction: 2 },
      ],
      lines: ['ch1.4.sauce.04', 'ch1.4.sauce.05'],
    });
  });
});
