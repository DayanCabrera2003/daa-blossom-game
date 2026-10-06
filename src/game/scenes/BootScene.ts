import Phaser from 'phaser';

/** First scene: nothing to load in the greybox (shapes only), so it hands over to the hub. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.scene.start('hub');
  }
}
