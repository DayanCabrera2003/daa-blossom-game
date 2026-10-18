import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { actionsUnlockedBy } from '@core/rules/permissions';
import type { GardenState } from '@core/rules/state';
import { describe, expect, it } from 'vitest';
import { festivalLevel, helixLevel } from '../../../tests/support/fixtureLevels';
import { push, startHistory, type History } from '../systems/history';
import { animationGarden } from './animationGarden';
import { oddGroupPictures } from './garden';

const after = (state: GardenState, actions: Action[]): GardenState =>
  actions.reduce((s, action) => {
    const outcome = applyAction(s, action);
    if (!outcome.ok) throw new Error(outcome.reason.code);
    return outcome.state;
  }, state);

const festival = festivalLevel();
const positions = festival.data.sprouts.map(({ x, y }) => ({ x, y }));
const outside = { positions, path: [] };
const unlocked: GardenState = { ...festival.start, allowed: new Set(actionsUnlockedBy('4.5')) };
const marked = after(unlocked, [
  { type: 'markRoot', vertex: 0 },
  { type: 'markMoon', from: 0, to: 1 },
  { type: 'markMoon', from: 2, to: 3 },
]);
const folded = after(marked, [{ type: 'foldAt', from: 4, to: 2 }]);
const flowerId = (state: GardenState): number => {
  const node = state.layer.nodes.find((n) => n.kind === 'blossom');
  if (node?.kind !== 'blossom') throw new Error('no flower');
  return node.id;
};

describe('what the animation of a move needs from the garden', () => {
  it('draws at the positions of the layer shown', () => {
    expect(animationGarden(startHistory(festival.start), outside).positions).toBe(positions);
  });

  it('knows a flower just folded, from the garden after the move', () => {
    const history = push(startHistory(marked), folded);
    const shape = animationGarden(history, outside).flowers.get(flowerId(folded));
    expect(shape?.petals).toBe(3);
  });

  it('knows a flower just opened, from the garden before the move', () => {
    const id = flowerId(folded);
    const opened = after(folded, [{ type: 'unfold', blossom: id }]);
    const history = push(startHistory(folded), opened);
    expect(animationGarden(history, outside).flowers.get(id)?.petals).toBe(3);
    // At the very start of the day there is no garden before: only the one shown.
    expect(animationGarden(startHistory(opened), outside).flowers.size).toBe(0);
  });

  it('outlines the odd groups the stones leave, outside the flowers only', () => {
    const helix = helixLevel();
    const at = helix.data.sprouts.map(({ x, y }) => ({ x, y }));
    const lifted = { ...helix.start, stones: [0] };
    const history: History<GardenState> = push(startHistory(helix.start), lifted);
    const { groups } = animationGarden(history, { positions: at, path: [] });
    expect(groups).toEqual(oddGroupPictures(lifted, (v) => at[v] ?? { x: 0, y: 0 }));
    expect(groups.length).toBeGreaterThan(0);
    expect(animationGarden(history, { positions: at, path: [0] }).groups).toEqual([]);
  });
});
