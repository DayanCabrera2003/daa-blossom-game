import { describe, expect, it } from 'vitest';
import { createRng } from '../shared/rng';
import { randomGraph } from './random';
import { RACE_FAMILIES, raceGarden } from './raceGarden';

describe('the gardens of the races (chapter 6)', () => {
  it('grows the half family as G(n, ½) from its seed', () => {
    expect(RACE_FAMILIES).toEqual(['half']);
    expect(raceGarden('half', 16, 26)).toEqual(randomGraph(16, 0.5, createRng(26)));
  });

  it('grows the same garden from the same seed, every time', () => {
    const garden = raceGarden('half', 32, 7);
    expect(garden.n).toBe(32);
    expect(raceGarden('half', 32, 7)).toEqual(garden);
    expect(raceGarden('half', 32, 8)).not.toEqual(garden);
  });
});
