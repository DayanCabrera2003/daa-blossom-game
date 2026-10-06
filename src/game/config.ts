import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './scale/integerZoom';
import { BootScene } from './scenes/BootScene';
import { HubScene } from './scenes/HubScene';
import { LevelScene } from './scenes/LevelScene';

/**
 * The Phaser setup: a 480×270 pixel-art canvas (GDD §4.1) shown at a whole zoom chosen by
 * `integerZoom`, never smoothed. Scenes are listed in the order Phaser starts them.
 */
export function gameConfig(parent: HTMLElement, zoom: number): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    zoom,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#1d2433',
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, HubScene, LevelScene],
  };
}
