import type Phaser from 'phaser';
import type { AssetKey } from '../assets/keys';
import { contextOf, type GameContext } from '../scenes/context';

/**
 * Plays one interface sound (a button, a page of the notebook, a mechanic card) on the effects
 * channel of the game's audio bus, from any view of any scene, without the view holding the bus.
 * Nothing plays when the sound is not loaded, or before the game has its shared context.
 */
export function playUiSound(scene: Phaser.Scene, key: AssetKey): void {
  const context = contextOf(scene) as GameContext | undefined;
  context?.audio.play('sfx', key);
}
