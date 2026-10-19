import { bipartition } from '@core/graph/bipartition';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { refutationAt, type Refutation } from '@levels/counterexample';
import type { LevelStep } from '@levels/flow';
import { describe, expect, it } from 'vitest';

/**
 * The whys asked (GDD §7, plan 10, phase 7): what the mentor or the Codex used to tell is now a
 * question of the script, asked after the player has seen it happen, and a false answer is refuted
 * by a reply or by a garden to touch. What a garden claims is checked with the core.
 */

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The question of the level's script, with the index of its step. */
const askOf = (level: Level): { at: number; ask: Extract<LevelStep, { step: 'ask' }> } => {
  const at = level.flow.findIndex((step) => step.step === 'ask');
  const ask = level.flow[at];
  if (ask?.step !== 'ask') throw new Error(`${level.data.id} asks nothing`);
  return { at, ask };
};

/** The garden that refutes the only false answer of the level's question that has one. */
const refutationOf = (level: Level): Refutation => {
  const { at, ask } = askOf(level);
  const option = ask.options.findIndex((answer) => answer.counterexample !== undefined);
  const refuted = refutationAt(level, at, option);
  if (refuted === null) throw new Error(`${level.data.id} refutes no answer with a garden`);
  return refuted;
};

/** Every mark from `from` to `to`, both ways, over each vine of the garden. */
const marksOf = (state: GardenState): Action[] => [
  ...state.graph.edges.flatMap(([u, v]): Action[] => [
    { type: 'markMoon', from: u, to: v },
    { type: 'markMoon', from: v, to: u },
  ]),
  ...Array.from({ length: state.graph.n }, (_, vertex): Action => ({ type: 'markRoot', vertex })),
];

/**
 * Every garden the player's marks reach from `start`, and every refusal those marks meet on the
 * way: an exhaustive walk, small because a counterexample is small.
 */
function walkMarks(start: GardenState): { gardens: GardenState[]; refusals: string[] } {
  const seen = new Set<string>();
  const gardens: GardenState[] = [];
  const refusals = new Set<string>();
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head] as GardenState;
    const key = JSON.stringify(state.search);
    if (seen.has(key)) continue;
    seen.add(key);
    gardens.push(state);
    for (const mark of marksOf(state)) {
      const outcome = applyAction(state, mark);
      if (outcome.ok) queue.push(outcome.state);
      else refusals.add(outcome.reason.code);
    }
  }
  return { gardens, refusals: [...refusals] };
}

describe('3.8: between bees and clovers, two suns of one tree never touch', () => {
  const level = levelOf('3.8');

  it('is asked after the search, before the mentor tells why the moons guard every vine', () => {
    const { at, ask } = askOf(level);
    const play = level.flow.findIndex((step) => step.step === 'play');
    const guards = level.flow.findIndex(
      (step) => step.step === 'say' && step.lines.includes('ch3.8.sauce.05'),
    );
    expect(play).toBeLessThan(at);
    expect(at).toBeLessThan(guards);
    expect(ask.retry).toBe(true);
  });

  it('its false answer opens a ring of bees and clovers to try it in', () => {
    const { counterexample } = refutationOf(level);
    expect(bipartition(counterexample.start.graph).kind).toBe('bipartite');
    expect(counterexample.data.sprouts.every((sprout) => sprout.kind !== undefined)).toBe(true);
    // A ring: some vine closes a loop, which is where two suns would touch if they could.
    const { n, edges } = counterexample.start.graph;
    expect(edges.length).toBeGreaterThanOrEqual(n);
  });

  it('no order of marks makes two suns of one tree touch, and the search reaches the ring whole', () => {
    const { counterexample } = refutationOf(level);
    const { gardens, refusals } = walkMarks(counterexample.start);
    expect(refusals).not.toContain('sunMeetsSun');
    // Some way of marking reaches every sprout, so the player can see the ring closed.
    const marked = (state: GardenState): VertexId[] =>
      state.search === null
        ? []
        : state.search.label.flatMap((label, vertex) => (label === 'none' ? [] : [vertex]));
    const most = Math.max(...gardens.map((state) => marked(state).length));
    expect(most).toBe(counterexample.start.graph.n);
  });
});
