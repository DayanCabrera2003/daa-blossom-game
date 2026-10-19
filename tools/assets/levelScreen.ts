// The level screen's entry: the level scene loads with import() the first time a level opens,
// through the thin gate scene `src/game/scenes/LevelGate.ts`, which stays in the initial script
// (tests/initialScript.test.ts). The budget weighs what that dynamic import loads in a part of its
// own, apart from the books and the free mode.

/** The source of the level scene, from the project root: the key of its chunk in the manifest. */
export const LEVEL_SCENE_SOURCE = 'src/game/scenes/LevelScene.ts';

/** Whether a dynamic entry's key, a source path from the project root, is the level screen's. */
export function isLevelScreen(key: string): boolean {
  return key === LEVEL_SCENE_SOURCE;
}
