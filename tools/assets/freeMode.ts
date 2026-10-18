// The folders of the free mode (plan 08, phases 8 to 10): its code loads with import() only when
// it opens, through the thin gate scene `src/game/scenes/SandboxGate.ts`, which stays outside
// them. The initial script must never reach them (tests/initialScript.test.ts), and the budget
// weighs what their dynamic imports load in a part of its own, apart from the books.

/** The source folders of the free mode, from the project root, each ending in a slash. */
export const FREE_MODE_FOLDERS: readonly string[] = [
  'src/levels/sandbox/',
  'src/game/scenes/sandbox/',
];

/** Whether a source path, from the project root, belongs to the free mode. */
export function isFreeMode(path: string): boolean {
  return FREE_MODE_FOLDERS.some((folder) => path.startsWith(folder));
}
