import {
  generate,
  generatorOf,
  type Generated,
  type GeneratorId,
} from '@levels/sandbox/generators';

/**
 * What the player has chosen in the free mode's generate menu (plan 08, section 1.3): a generator,
 * its size and the seed of the random ones. Pure: the menu asks what each of its buttons does now,
 * and the scene grows the garden the choice names. A size is always inside the generator's range,
 * so the core is never asked for a garden the menu does not offer.
 */
export interface GenerateChoice {
  /** The generator picked, or null before the first pick. */
  readonly id: GeneratorId | null;
  readonly size: number;
  /** The seed of a random generator; "Otro al azar" moves it on. */
  readonly seed: number;
}

/** The menu as it opens the first time: nothing picked yet. */
export const FIRST_CHOICE: GenerateChoice = { id: null, size: 0, seed: 1 };

/** The size a generator starts at: a third of the way from its smallest to its largest. */
export function defaultSize(id: GeneratorId): number {
  const { min, max } = generatorOf(id);
  return min + Math.floor((max - min) / 3);
}

/** Picks a generator; the one already picked keeps its size, another starts at its own. */
export const pickGenerator = (choice: GenerateChoice, id: GeneratorId): GenerateChoice =>
  choice.id === id ? choice : { ...choice, id, size: defaultSize(id) };

/** Whether "−" can make the garden smaller, and "+" larger. */
export const canShrink = (choice: GenerateChoice): boolean =>
  choice.id !== null && choice.size > generatorOf(choice.id).min;
export const canGrow = (choice: GenerateChoice): boolean =>
  choice.id !== null && choice.size < generatorOf(choice.id).max;

/** One size smaller or larger, when the generator offers it. */
export function resizeChoice(choice: GenerateChoice, step: -1 | 1): GenerateChoice {
  const can = step < 0 ? canShrink(choice) : canGrow(choice);
  return can ? { ...choice, size: choice.size + step } : choice;
}

/** Whether "Otro al azar" is offered: for a random generator only. */
export const canReseed = (choice: GenerateChoice): boolean =>
  choice.id !== null && generatorOf(choice.id).random;

/** Another garden at random: the next seed, for a random generator. */
export const anotherSeed = (choice: GenerateChoice): GenerateChoice =>
  canReseed(choice) ? { ...choice, seed: choice.seed + 1 } : choice;

/** The garden the choice grows, or null before a generator is picked. */
export const grow = (choice: GenerateChoice): Generated | null =>
  choice.id === null ? null : generate(choice.id, choice.size, choice.seed);
