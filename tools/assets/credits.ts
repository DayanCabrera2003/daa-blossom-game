// The folders and modules of the credits screen (plan 09, phase 3): its code loads with import()
// only when the credits open, through the thin gate scene `src/game/scenes/CreditsGate.ts`, which
// stays outside them, like the free mode's. The initial script must never reach them
// (tests/initialScript.test.ts); the budget weighs them with the other parts loaded on demand.

/** The source folders of the credits screen, from the project root, each ending in a slash. */
export const CREDITS_FOLDERS: readonly string[] = ['src/game/scenes/credits/'];

/**
 * The credits' own modules that live in the pure folders: what the screen says and the roll it is
 * laid on. Only the credits scene imports them, so they load with it.
 */
export const CREDITS_MODULES: readonly string[] = [
  'src/game/assets/creditsModel.ts',
  'src/game/assets/libraryCredits.ts',
  'src/game/picture/creditsRoll.ts',
];

/** Whether a source path, from the project root, belongs to the credits screen. */
export function isCredits(path: string): boolean {
  return (
    CREDITS_FOLDERS.some((folder) => path.startsWith(folder)) || CREDITS_MODULES.includes(path)
  );
}
