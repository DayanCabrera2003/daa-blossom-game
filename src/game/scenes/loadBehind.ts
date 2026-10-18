import type Phaser from 'phaser';
import type { AssetKey } from '../assets/keys';
import { loadRequests } from '../assets/loadPlan';
import { queueLoads } from './queueLoads';

/**
 * Loads `keys` behind a scene that is already showing (plan 09, phase 9): the scene does not wait
 * for them, and each sound lands in the game's audio cache as it arrives, where the music player
 * picks up a track still wanted. A scene left before they arrive does not lose them: Phaser's
 * loader still adds a file already on its way to the cache. Nothing to load starts nothing.
 */
export function loadBehind(scene: Phaser.Scene, keys: readonly AssetKey[]): void {
  if (keys.length === 0) return;
  queueLoads(scene.load, loadRequests(keys));
  scene.load.start();
}
