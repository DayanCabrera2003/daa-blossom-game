/**
 * How much the game moves (plan 09, phase 6): the player's own choice in the settings, which starts
 * by following the system's "reduce motion" preference and can ask for less or for all of it
 * whatever the system says. With less motion the lantern does not squash and stretch, no petals
 * fly, the fog and the leaves stand still, and hops and folds are short fades; what each step
 * tells (which lantern, which flower) shows just the same. Pure: the system's preference is
 * passed in, read by whoever asks.
 */

/** The positions of the setting: like the system, less motion, or all of it. */
export const MOTION_CHOICES = ['system', 'reduced', 'full'] as const;

/** One position of the setting. */
export type MotionChoice = (typeof MOTION_CHOICES)[number];

/** Whether to move less, from the player's `choice` and whether `systemAsks` for less motion. */
export const reducesMotion = (choice: MotionChoice, systemAsks: boolean): boolean =>
  choice === 'system' ? systemAsks : choice === 'reduced';
