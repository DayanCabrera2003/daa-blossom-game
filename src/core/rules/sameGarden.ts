import type { GardenState } from './state';

/**
 * Which parts of a garden tell two gardens apart for the player. Water spent is ignored on purpose
 * (undoing gives the fog back, not the water), and so are the graph and the allowed actions, which
 * the level fixes. Typed as a full record of `GardenState`, so a field added to the garden does
 * not compile until it is classified here.
 */
const FIELDS = {
  graph: 'ignored',
  matching: 'compared',
  layer: 'compared',
  search: 'compared',
  revealed: 'compared',
  waterUsed: 'ignored',
  scarecrows: 'compared',
  stones: 'compared',
  chainSeen: 'compared',
  declaredDone: 'compared',
  allowed: 'ignored',
} as const satisfies Record<keyof GardenState, 'compared' | 'ignored'>;

const COMPARED = (Object.keys(FIELDS) as (keyof GardenState)[]).filter(
  (field) => FIELDS[field] === 'compared',
);

/**
 * The compared parts of a garden as one string. The core builds every garden the same way, field
 * by field, so equal gardens serialise equally.
 */
const keyOf = (state: GardenState): string => JSON.stringify(COMPARED.map((field) => state[field]));

/** Whether two gardens are the same for the player, however each was reached. */
export const sameGarden = (a: GardenState, b: GardenState): boolean => keyOf(a) === keyOf(b);
