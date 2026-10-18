import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './scale/integerZoom';
import { BootScene } from './scenes/BootScene';
import { CounterexampleScene } from './scenes/CounterexampleScene';
import { HubScene } from './scenes/HubScene';
import { LevelScene } from './scenes/LevelScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SandboxGate } from './scenes/SandboxGate';
import { PALETTE } from './view/palette';

/**
 * The Phaser setup. The game is laid out on a 480×270 logical canvas (GDD §4.1); the real canvas is
 * that size times the whole zoom chosen by `integerZoom`, and each scene's camera zooms by the same
 * factor (`fitCamera`). Pixel art stays unsmoothed, while text is rasterised at full resolution and
 * stays legible. The canvas clears to the palette's background, the colour views erase with. Scenes are listed in the order Phaser starts them.
 * The free mode is registered by its thin gate only, which adds the free mode's own scene once its
 * chunk has loaded (plan 08, phase 10).
 */
export function gameConfig(parent: HTMLElement, zoom: number): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: CANVAS_WIDTH * zoom,
    height: CANVAS_HEIGHT * zoom,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: PALETTE.background,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, PreloadScene, HubScene, LevelScene, CounterexampleScene, SandboxGate],
  };
}
