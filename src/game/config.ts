import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './scale/integerZoom';
import { BootScene } from './scenes/BootScene';
import { CounterexampleScene } from './scenes/CounterexampleScene';
import { HubScene } from './scenes/HubScene';
import { LevelScene } from './scenes/LevelScene';

/**
 * The Phaser setup. The game is laid out on a 480×270 logical canvas (GDD §4.1); the real canvas is
 * that size times the whole zoom chosen by `integerZoom`, and each scene's camera zooms by the same
 * factor (`fitCamera`). Pixel art stays unsmoothed, while text is rasterised at full resolution and
 * stays legible. Scenes are listed in the order Phaser starts them.
 */
export function gameConfig(parent: HTMLElement, zoom: number): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: CANVAS_WIDTH * zoom,
    height: CANVAS_HEIGHT * zoom,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#1d2433',
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, HubScene, LevelScene, CounterexampleScene],
  };
}
