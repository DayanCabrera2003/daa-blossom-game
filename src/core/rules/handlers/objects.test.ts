import { describe, expect, it } from 'vitest';
import { pathGraph } from '../../generators/families';
import { createGardenState } from '../state';
import { declareDone } from './declareDone';
import { placeScarecrow, removeScarecrow } from './scarecrows';
import { dropStone, liftStone } from './stones';

// Level 3.7, part I: the path 1–2–3–4–5 as 0..4.
const garden = createGardenState({ graph: pathGraph(5), allowed: [] });

describe('scarecrows (level 3.7)', () => {
  it('places and removes a scarecrow', () => {
    const placed = placeScarecrow(garden, { type: 'placeScarecrow', vertex: 1 });
    expect(placed.ok && placed.state.scarecrows).toEqual([1]);
    expect(placed.ok && placed.events).toEqual([{ type: 'scarecrow', vertex: 1, placed: true }]);
    if (!placed.ok) return;
    const removed = removeScarecrow(placed.state, { type: 'removeScarecrow', vertex: 1 });
    expect(removed.ok && removed.state.scarecrows).toEqual([]);
    expect(removed.ok && removed.events).toEqual([{ type: 'scarecrow', vertex: 1, placed: false }]);
  });

  it('refuses a second scarecrow on a sprout, or removing one that is not there', () => {
    const placed = placeScarecrow(garden, { type: 'placeScarecrow', vertex: 1 });
    if (!placed.ok) throw new Error('refused');
    expect(placeScarecrow(placed.state, { type: 'placeScarecrow', vertex: 1 })).toMatchObject({
      reason: { code: 'alreadyPlaced', vertex: 1 },
    });
    expect(removeScarecrow(garden, { type: 'removeScarecrow', vertex: 3 })).toMatchObject({
      reason: { code: 'notPlaced', vertex: 3 },
    });
    expect(placeScarecrow(garden, { type: 'placeScarecrow', vertex: 5 })).toMatchObject({
      reason: { code: 'vertexOutOfRange', vertex: 5 },
    });
  });
});

describe('stones (level 7.2)', () => {
  it('lifts and puts back a stone', () => {
    const lifted = liftStone(garden, { type: 'liftStone', vertex: 2 });
    expect(lifted.ok && lifted.state.stones).toEqual([2]);
    expect(lifted.ok && lifted.events).toEqual([{ type: 'stone', vertex: 2, lifted: true }]);
    if (!lifted.ok) return;
    const dropped = dropStone(lifted.state, { type: 'dropStone', vertex: 2 });
    expect(dropped.ok && dropped.state.stones).toEqual([]);
    expect(dropStone(garden, { type: 'dropStone', vertex: 2 })).toMatchObject({
      reason: { code: 'notPlaced', vertex: 2 },
    });
    expect(liftStone(garden, { type: 'liftStone', vertex: -3 })).toMatchObject({
      reason: { code: 'vertexOutOfRange' },
    });
    expect(liftStone(lifted.state, { type: 'liftStone', vertex: 2 })).toMatchObject({
      reason: { code: 'alreadyPlaced' },
    });
  });
});

describe('"Terminé"', () => {
  it('the player declares the garden finished; whether it is right is for victory to say', () => {
    const outcome = declareDone(garden);
    expect(outcome.ok && outcome.state.declaredDone).toBe(true);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'declareDone' }]);
  });
});
