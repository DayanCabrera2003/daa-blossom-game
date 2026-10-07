import Phaser from 'phaser';
import { contextOf } from './context';

/**
 * First scene: nothing to load in the greybox (shapes only), so it hands over to the hub, or
 * straight to a level when teacher mode asks for one.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { startLevel } = contextOf(this);
    if (startLevel === null) this.scene.start('hub');
    else this.scene.start('level', { levelId: startLevel });
  }
}
