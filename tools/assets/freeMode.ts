// The folders and modules of the free mode (plan 08, phases 8 to 13): its code loads with import()
// only when it opens, through the thin gate scene `src/game/scenes/SandboxGate.ts`, which stays
// outside them. The initial script must never reach them (tests/initialScript.test.ts), and the
// budget weighs what their dynamic imports load in a part of its own, apart from the books.

/** The source folders of the free mode, from the project root, each ending in a slash. */
export const FREE_MODE_FOLDERS: readonly string[] = [
  'src/levels/sandbox/',
  'src/game/scenes/sandbox/',
];

/**
 * The free mode's own modules that live in the pure folders (plan 08, phases 11 and 13), beside the
 * levels' pure logic: the editor's input, history, pictures and sounds, its design's store, and the
 * orders on a garden being played. Only the free mode imports them, so they load with it and never
 * with the initial script.
 */
export const FREE_MODE_MODULES: readonly string[] = [
  'src/game/input/designIntent.ts',
  'src/game/input/designKeys.ts',
  'src/game/systems/designHistory.ts',
  'src/game/systems/designSounds.ts',
  'src/game/systems/generateChoice.ts',
  'src/game/picture/designHeader.ts',
  'src/game/picture/designPicture.ts',
  'src/game/picture/designReason.ts',
  'src/game/picture/designToolbar.ts',
  'src/game/picture/editorCard.ts',
  'src/game/picture/generateDrawer.ts',
  // The orders on a garden being played (phase 13): the gardener, the certificate and their words.
  'src/game/systems/appendDay.ts',
  'src/game/systems/lentDay.ts',
  'src/game/systems/sandboxCertificate.ts',
  'src/game/systems/sandboxOrders.ts',
  'src/game/systems/sandboxSolve.ts',
  // The store of the last design: read and checked only when the free mode opens.
  'src/services/sandboxStore.ts',
  // What the share sheet shows (phase 14), decided for its DOM in the sheet's own chunk.
  'src/ui/model/shareSheet.ts',
];

/** Whether a source path, from the project root, belongs to the free mode. */
export function isFreeMode(path: string): boolean {
  return (
    FREE_MODE_FOLDERS.some((folder) => path.startsWith(folder)) || FREE_MODE_MODULES.includes(path)
  );
}
