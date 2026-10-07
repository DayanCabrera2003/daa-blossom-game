import { checkIntegrity } from '@levels/integrity';
import { describe, expect, it } from 'vitest';
import {
  automatonLevel,
  betrayalLevel,
  brokenRecipeLevel,
  closedFlowerLevel,
  festivalLevel,
  fivePetalsLevel,
  helixLevel,
  nestedFlowersLevel,
  pentagonLevel,
  recipeLevel,
  stemRotationLevel,
  twoComponentsLevel,
} from './fixtureLevels';

const FIXTURES = [
  ['4.1', festivalLevel],
  ['4.2', betrayalLevel],
  ['4.6', fivePetalsLevel],
  ['4.9', closedFlowerLevel],
  ['4.10', stemRotationLevel],
  ['5.1', nestedFlowersLevel],
  ['6.1', recipeLevel],
  ['6.3', brokenRecipeLevel],
  ['6.3', automatonLevel],
  ['7.2', pentagonLevel],
  ['7.3', helixLevel],
  ['7.4', twoComponentsLevel],
] as const;

describe('the fixture levels for tests', () => {
  it.each(FIXTURES)('%s loads and is as sound as a level file', (id, build) => {
    const level = build();
    expect(level.data.id).toBe(id);
    expect(checkIntegrity(level)).toEqual([]);
  });
});
