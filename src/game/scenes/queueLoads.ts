import type Phaser from 'phaser';
import type { LoadRequest } from '../assets/loadPlan';

/**
 * Hands the load requests `game/assets/loadPlan.ts` decided to a scene's loader. Nothing is
 * decided here: each request names its loader, key and path (a sound, its files in order).
 */
export function queueLoads(
  load: Phaser.Loader.LoaderPlugin,
  requests: readonly LoadRequest[],
): void {
  for (const request of requests) {
    switch (request.loader) {
      case 'image':
        load.image(request.key, request.path);
        break;
      case 'spritesheet':
        load.spritesheet(request.key, request.path, {
          frameWidth: request.frameWidth,
          frameHeight: request.frameHeight,
        });
        break;
      case 'audio':
        // The loader takes the first file the browser says it can play.
        load.audio(request.key, [...request.paths]);
        break;
    }
  }
}
