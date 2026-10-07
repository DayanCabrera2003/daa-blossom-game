import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { describe, expect, it } from 'vitest';
import { nestedFlowersLevel } from '../../../tests/support/fixtureLevels';
import type { Point } from '../input/target';
import { gardenPicture, NO_EXTRAS } from './garden';
import { layerPicture } from './layerPicture';
import { layerView, OUTSIDE } from './layers';

const after = (state: GardenState, actions: readonly Action[]) =>
  actions.reduce((s, action) => {
    const outcome = applyAction(s, action);
    if (!outcome.ok) throw new Error(outcome.reason.code);
    return outcome.state;
  }, state);

// The garden of 5.1 (R a b c d g h t = 0…7), with F1 = {b, c, d} (0) folded inside F2 (1).
const wild = nestedFlowersLevel();
const places: Point[] = wild.data.sprouts.map(({ x, y }) => ({ x, y }));
const labels = wild.data.sprouts.map(({ label }) => label);
const twice = after(wild.start, wild.solution.slice(0, 6) as Action[]);
const picture = (path: readonly number[]) =>
  layerPicture(twice, layerView(twice.layer, places, path), labels, NO_EXTRAS);
const vineNames = (p: ReturnType<typeof picture>, inFlower: boolean) =>
  p.vines
    .filter((vine) => vine.inFlower === inFlower)
    .map((vine) => `${labels[vine.u]}${labels[vine.v]}`)
    .sort();

describe('the picture of one layer', () => {
  it('outside, it is the picture of the garden itself', () => {
    expect(picture(OUTSIDE)).toEqual(gardenPicture(twice, places, labels, NO_EXTRAS));
  });

  it('inside F2: its petals and F1 folded among them, with its own vines inside it', () => {
    const inside = picture([1]);
    expect(inside.sprouts.map((s) => s.label)).toEqual(['R', 'a', 'b', 'c', 'd', 'g', 'h']);
    expect(inside.flowers.map((f) => [f.id, f.depth])).toEqual([[0, 0]]);
    expect(vineNames(inside, false)).toEqual(['Ra', 'Rh', 'ab', 'cg', 'gh']);
    expect(vineNames(inside, true)).toEqual(['bc', 'bd', 'cd']);
  });

  it('inside F1: its three petals, enlarged, free of any flower', () => {
    const view = layerView(twice.layer, places, [1, 0]);
    const inside = layerPicture(twice, view, labels, NO_EXTRAS);
    expect(inside.sprouts.map((s) => [s.label, s.x, s.y])).toEqual(
      [2, 3, 4].map((v) => [labels[v], view.positions[v]?.x, view.positions[v]?.y]),
    );
    expect(inside.flowers).toEqual([]);
    expect(vineNames(inside, false)).toEqual(['bc', 'bd', 'cd']);
    expect(inside.oddGroups).toEqual([]);
  });
});
