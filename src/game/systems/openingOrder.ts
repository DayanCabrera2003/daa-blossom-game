/**
 * The order a level opens in (GDD §5.11): the mechanic cards of what opens with it, and the effects
 * its script opens with. A level that opens with a line of the mentor says it first, so the story
 * and the garden it names come before the cards; any other level shows its cards first, as before.
 * Pure: the scene shows each item in the order given.
 */

/** Where the cards of the level's opening go among its effects. */
export type OpeningItem<E> = E | 'cards';

/** The opening `effects` of a level, with the place of its cards among them. */
export function openingOrder<E extends { readonly kind: string }>(
  effects: readonly E[],
): OpeningItem<E>[] {
  const [first, ...rest] = effects;
  if (first?.kind === 'say') return [first, 'cards', ...rest];
  return ['cards', ...effects];
}
