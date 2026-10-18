import type { SaveData } from './save';

/**
 * The cosmetics of the hub (GDD §5.4, plan 08 section 1.2): little lives that come to the garden
 * of the hub as the stars add up. Nothing is bought or spent: each comes on its own once the stars
 * reach its threshold, and never leaves. Which ones are there is derived from the stars and seeds;
 * the save keeps only those already announced.
 */

/** The cosmetics that stars bring, each with the stars it needs, from the first to the last. */
export const COSMETICS = [
  { id: 'butterfly', stars: 15 },
  { id: 'frog', stars: 30 },
  { id: 'cat', stars: 50 },
  { id: 'butterflyBlue', stars: 70 },
  { id: 'chickens', stars: 90 },
  { id: 'fireflies', stars: 110 },
  { id: 'lanterns', stars: 130 },
] as const;

/** The plants of the seeds, which the first bet won brings rather than stars. */
const SEEDLING = 'seedling' as const;

/** A cosmetic of the hub. */
export type CosmeticId = (typeof COSMETICS)[number]['id'] | typeof SEEDLING;

/** Every cosmetic, in the order they come: those of the stars, then the seedlings. */
export const COSMETIC_IDS: readonly CosmeticId[] = [
  ...COSMETICS.map((cosmetic) => cosmetic.id),
  SEEDLING,
];

/**
 * The cosmetics a player has, in the order they come: those whose threshold the stars reach, and
 * the seedlings once there is a seed. Teacher mode shows them all (GDD §5.8).
 */
export function openCosmetics(
  { stars, seeds }: { readonly stars: number; readonly seeds: number },
  teacherMode: boolean,
): CosmeticId[] {
  const byStars = COSMETICS.filter((cosmetic) => teacherMode || stars >= cosmetic.stars);
  return [
    ...byStars.map((cosmetic) => cosmetic.id),
    ...(teacherMode || seeds > 0 ? [SEEDLING] : []),
  ];
}

/** The cosmetics of `open` not announced yet: each gets its notice in the hub once. */
export function newCosmetics(open: readonly CosmeticId[], save: SaveData): CosmeticId[] {
  return open.filter((id) => !save.cosmeticsSeen.includes(id));
}
