import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { describe, expect, it } from 'vitest';
import { nestedFlowersLevel } from '../../../tests/support/fixtureLevels';
import type { Point } from '../input/target';
import {
  enterFlower,
  layerView,
  leaveFlower,
  MAX_ZOOM,
  OUTSIDE,
  settlePath,
  toScreen,
} from './layers';

const after = (state: GardenState, actions: readonly Action[]) =>
  actions.reduce((s, action) => {
    const outcome = applyAction(s, action);
    if (!outcome.ok) throw new Error(outcome.reason.code);
    return outcome.state;
  }, state);

// The garden of 5.1: R a b c d g h t are 0…7. Its solution folds F1 = {b, c, d} (flower 0) and
// then F2 = {R, a, F1, g, h} (flower 1) in its first six moves.
const wild = nestedFlowersLevel();
const places: Point[] = wild.data.sprouts.map(({ x, y }) => ({ x, y }));
const twice = after(wild.start, wild.solution.slice(0, 6) as Action[]);
const [R, a, b, c, d, g, h, t] = [0, 1, 2, 3, 4, 5, 6, 7];

/** What each node shown is, as a sprout number or a flower name. */
const described = (view: ReturnType<typeof layerView>) =>
  view.nodes.map((node) => (node.kind === 'sprout' ? node.vertex : `F${node.id}`)).sort();
const shownSprouts = (view: ReturnType<typeof layerView>) =>
  view.shown.flatMap((shown, v) => (shown ? [v] : []));

describe('the layers: what is seen at each depth of folded flowers (5.2)', () => {
  it('outside, the garden is as it is: F2 folded on top, every sprout where the level puts it', () => {
    const view = layerView(twice.layer, places, OUTSIDE);
    expect(view.path).toEqual([]);
    expect(described(view)).toEqual([t, 'F1'].sort());
    expect(view.positions).toEqual(places);
    expect(shownSprouts(view)).toEqual([R, a, b, c, d, g, h, t]);
    expect(view.groupOf).toEqual(twice.layer.nodeOf);
  });

  it('inside F2, F1 is seen folded beside the other petals; t, outside F2, is not seen', () => {
    const view = layerView(twice.layer, places, [1]);
    expect(view.path).toEqual([1]);
    expect(described(view)).toEqual([R, a, g, h, 'F0'].sort());
    expect(shownSprouts(view)).toEqual([R, a, b, c, d, g, h]);
    // The three sprouts of F1 make one node of this layer; t belongs to none.
    expect(view.groupOf[b]).toBe(view.groupOf[c]);
    expect(view.groupOf[b]).toBe(view.groupOf[d]);
    expect(view.groupOf[a]).not.toBe(view.groupOf[b]);
    expect(view.groupOf[t]).toBe(-1);
  });

  it('inside F1, its three petals, enlarged around the centre of the garden', () => {
    const view = layerView(twice.layer, places, [1, 0]);
    expect(described(view)).toEqual([b, c, d]);
    expect(shownSprouts(view)).toEqual([b, c, d]);
    expect(view.transform.scale).toBeGreaterThan(1);
    expect(view.transform.scale).toBeLessThanOrEqual(MAX_ZOOM);
    // The same transform draws every sprout: the layer is the garden enlarged, never rearranged.
    places.forEach((p, v) => expect(view.positions[v]).toEqual(toScreen(view.transform, p)));
    // The petals fill the garden's own box, centred in it.
    const xs = [b, c, d].map((v) => view.positions[v]?.x ?? NaN);
    const ys = [b, c, d].map((v) => view.positions[v]?.y ?? NaN);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(180);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(115);
    expect(Math.min(...ys)).toBeCloseTo(30);
    expect(Math.max(...ys)).toBeCloseTo(200);
  });

  it('a flower of a single line of petals is enlarged no more than the most the layers zoom', () => {
    const view = layerView(
      twice.layer,
      places.map((p, v) => ([b, c, d].includes(v) ? { x: 250, y: 60 + v } : p)),
      [1, 0],
    );
    expect(view.transform.scale).toBe(MAX_ZOOM);
  });

  it('a flower is entered from the layer that shows it: F2 from outside, then F1 from inside F2', () => {
    expect(enterFlower(twice.layer, OUTSIDE, 0)).toEqual([]);
    expect(enterFlower(twice.layer, OUTSIDE, 1)).toEqual([1]);
    expect(enterFlower(twice.layer, [1], 0)).toEqual([1, 0]);
    // A flower that is not there, or a sprout's number, enters nothing.
    expect(enterFlower(twice.layer, [1], 7)).toEqual([1]);
    expect(enterFlower(twice.layer, [1, 0], 0)).toEqual([1, 0]);
  });

  it('leaving goes back to the layer before, and outside stays outside', () => {
    expect(leaveFlower([1, 0])).toEqual([1]);
    expect(leaveFlower([1])).toEqual([]);
    expect(leaveFlower(OUTSIDE)).toEqual([]);
  });

  it('when the garden changes, the view goes to the nearest layer that still exists', () => {
    expect(settlePath(twice.layer, [1, 0])).toEqual([1, 0]);
    // F2 opened: F1 is on top now, and its inside is still there to look at.
    const opened = after(twice, [{ type: 'unfold', blossom: 1 }]);
    expect(settlePath(opened.layer, [1, 0])).toEqual([0]);
    expect(settlePath(opened.layer, [1])).toEqual([]);
    expect(layerView(opened.layer, places, [1, 0]).path).toEqual([0]);
    // Both opened: back outside.
    const open = after(opened, [{ type: 'unfold', blossom: 0 }]);
    expect(settlePath(open.layer, [1, 0])).toEqual([]);
    expect(enterFlower(open.layer, [1, 0], 0)).toEqual([]);
  });
});
