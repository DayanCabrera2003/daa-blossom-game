import type Phaser from 'phaser';

/**
 * Calls `tick` with the scene's clock on every frame of `scene` until the scene shuts down, so a
 * view can move its own small animations (blinks, a lantern's flicker, drifting fog) without the
 * scene having to call it. `'update'` and `'shutdown'` are the names of Phaser's scene events.
 */
export function everyFrame(scene: Phaser.Scene, tick: (now: number) => void): void {
  const onUpdate = (time: number): void => tick(time);
  scene.events.on('update', onUpdate);
  scene.events.once('shutdown', () => scene.events.off('update', onUpdate));
}
