import type Phaser from 'phaser';
import { CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Makes a scene's camera show the 480×270 logical canvas filling the real one: zoomed by the whole
 * factor between them, pinned at the top-left corner. Follows the window when the game is resized,
 * so every scene keeps drawing and reading touches in logical pixels.
 */
export function fitCamera(scene: Phaser.Scene): void {
  const fit = (): void => {
    scene.cameras.main.setOrigin(0, 0).setZoom(scene.scale.width / CANVAS_WIDTH);
  };
  fit();
  scene.scale.on('resize', fit);
  scene.events.once('shutdown', () => scene.scale.off('resize', fit));
}
