import { createGraph } from '@core/graph/createGraph';
import type { Edge } from '@core/graph/types';
import { createMatching } from '@core/matching/createMatching';
import type { Matching } from '@core/matching/types';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { betrayalLevel } from '../../../tests/support/fixtureLevels';
import { countAnswer, rightBet, rightCount, rightLoopCount } from './answerKey';

// A path a–b–c–d plus a lone pair e–f: sprouts 0…5.
const graph = createGraph(6, [
  [0, 1],
  [1, 2],
  [2, 3],
  [4, 5],
]);
if (!graph.ok) throw new Error('fixture garden');
const lanterns = (edges: Edge[]): Matching => {
  const built = createMatching(graph.value, edges);
  if (!built.ok) throw new Error('fixture lanterns');
  return built.value;
};

/** Plays moves in order; a refusal here is a test bug. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

describe('the answers the core gives to the questions of a script', () => {
  it('the right bet is the most lanterns the garden can hold, whatever the level says', () => {
    for (const level of catalog()) {
      if (level.data.goal.visible) expect(rightBet(level)).toBe(level.data.goal.value);
    }
    const trap = catalog().find((level) => level.data.id === '1.1');
    expect(trap && rightBet(trap)).toBe(2);
  });

  it('a count is the lanterns of one side on the piece through the sprout', () => {
    // Yours: b=c and e=f. Reflection: a=b, c=d and e=f; the common pair is not in the tangle.
    const yours = lanterns([
      [1, 2],
      [4, 5],
    ]);
    const mirror = lanterns([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
    expect(rightCount(yours, mirror, { piece: 3, of: 'yours' })).toBe(1);
    expect(rightCount(yours, mirror, { piece: 0, of: 'mirror' })).toBe(2);
    expect(rightCount(yours, mirror, { piece: 4, of: 'mirror' })).toBe(0);
  });

  it('a count of the loop is the sprouts of the loop the search closed; 0 with no conflict', () => {
    const level = betrayalLevel();
    const searched = play(level.start, level.solution);
    expect(rightLoopCount(searched)).toBe(3);
    expect(rightLoopCount(level.start)).toBe(0);
    const step = level.flow[1];
    if (step?.step !== 'count') throw new Error('4.2 counts after its play step');
    expect(countAnswer(level, searched, step)).toBe(3);
  });
});
