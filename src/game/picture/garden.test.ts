import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { actionsUnlockedBy } from '@core/rules/permissions';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { NO_SELECTION } from '../input/selection';
import { gardenPicture, NO_EXTRAS } from './garden';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};
const after = (state: GardenState, actions: Action[]) =>
  actions.reduce((s, action) => {
    const outcome = applyAction(s, action);
    if (!outcome.ok) throw new Error(outcome.reason.code);
    return outcome.state;
  }, state);
const placesOf = (level: Level) => level.data.sprouts.map(({ x, y }) => ({ x, y }));
const labelsOf = (level: Level) => level.data.sprouts.map(({ label }) => label);

describe('the picture of the garden', () => {
  const festival = levelById('4.1');
  const picture = (state: GardenState, extras = NO_EXTRAS) =>
    gardenPicture(state, placesOf(festival), labelsOf(festival), extras);

  it('draws every sprout where the level puts it, with its name, dark or lit', () => {
    const { sprouts } = picture(festival.start);
    expect(sprouts[0]).toMatchObject({
      vertex: 0,
      x: 50,
      y: 135,
      label: 'R',
      lit: false,
      mark: null,
    });
    expect(sprouts[1]).toMatchObject({ label: 'a', lit: true });
  });

  it('draws every vine, lit or dark', () => {
    const { vines } = picture(festival.start);
    expect(vines).toHaveLength(6);
    expect(vines.find((vine) => vine.u === 1 && vine.v === 2)).toMatchObject({
      lit: true,
      visible: true,
    });
    expect(vines.find((vine) => vine.u === 0 && vine.v === 1)).toMatchObject({ lit: false });
  });

  it('shows suns and moons, a flower as a sun, and its outline with its own vines inside', () => {
    const unlocked: GardenState = { ...festival.start, allowed: new Set(actionsUnlockedBy('4.4')) };
    const folded = after(unlocked, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'foldAt', from: 4, to: 2 },
    ]);
    const { sprouts, flowers, vines } = picture(folded);
    expect(sprouts.map((s) => s.mark)).toEqual(['sun', 'moon', 'sun', 'sun', 'sun', null]);
    expect(flowers).toHaveLength(1);
    expect(flowers[0]).toMatchObject({ id: 0, depth: 0 });
    expect(vines.find((vine) => vine.u === 2 && vine.v === 3)?.inFlower).toBe(true);
    expect(vines.find((vine) => vine.u === 3 && vine.v === 5)?.inFlower).toBe(false);
  });

  it('nested flowers are drawn one inside the other, outermost first (5.1, 5.2)', () => {
    const wild = levelById('5.1');
    const twice = after(wild.start, wild.solution.slice(0, 6) as Action[]);
    const { flowers } = gardenPicture(twice, placesOf(wild), labelsOf(wild), NO_EXTRAS);
    expect(flowers.map((f) => [f.id, f.depth])).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it('in the fog, only vines of inspected sprouts are seen', () => {
    const foggy = { ...festival.start, revealed: [false, true, false, false, false, false] };
    const { vines, fog } = picture(foggy);
    expect(fog).toEqual({ revealed: [false, true, false, false, false, false] });
    expect(vines.filter((vine) => vine.visible).map((vine) => [vine.u, vine.v])).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it('shows what the player is pointing at: selection, glowing sprouts, the chain being dragged', () => {
    const extras = {
      selection: { kind: 'loop', vertices: [2, 3] } as const,
      highlight: [5],
      chain: [0, 1, 2],
    };
    const { sprouts, chain } = picture(festival.start, extras);
    expect(sprouts.filter((s) => s.selected).map((s) => s.vertex)).toEqual([2, 3]);
    expect(sprouts.filter((s) => s.highlighted).map((s) => s.vertex)).toEqual([5]);
    expect(sprouts.filter((s) => s.inChain).map((s) => s.vertex)).toEqual([0, 1, 2]);
    expect(chain).toEqual({ points: placesOf(festival).slice(0, 3), gain: 0 });
    expect(
      picture(festival.start, { ...extras, selection: { kind: 'sprout', vertex: 4 } }).sprouts[4]
        ?.selected,
    ).toBe(true);
  });

  it('stones and scarecrows sit on their sprouts; lifted stones outline the odd groups (7.3)', () => {
    const helix = levelById('7.3');
    const lifted = { ...helix.start, stones: [0], scarecrows: [4] };
    const { sprouts, oddGroups } = gardenPicture(
      lifted,
      placesOf(helix),
      labelsOf(helix),
      NO_EXTRAS,
    );
    expect(sprouts[0]).toMatchObject({ stone: true, scarecrow: false });
    expect(sprouts[4]).toMatchObject({ stone: false, scarecrow: true });
    expect(oddGroups).toHaveLength(3);
    expect(
      gardenPicture(helix.start, placesOf(helix), labelsOf(helix), NO_EXTRAS).oddGroups,
    ).toEqual([]);
  });

  it('nothing pointed at by default', () => {
    expect(NO_EXTRAS).toEqual({ selection: NO_SELECTION, highlight: [], chain: null });
    expect(picture(festival.start).chain).toBeNull();
  });
});
