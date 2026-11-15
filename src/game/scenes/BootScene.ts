import Phaser from 'phaser';

/**
 * First scene: it holds nothing to load itself and hands over to the preload scene, which loads the
 * art and sounds of the boot group and then opens the screen the game starts on.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.scene.start('preload');
  }
}
