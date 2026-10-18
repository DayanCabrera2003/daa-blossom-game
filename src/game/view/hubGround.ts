import type Phaser from 'phaser';
import { groundOf, seedOf } from '../picture/backdrop';
import { HUB_TINT } from '../picture/hubGarden';
import { seasonOf } from '../picture/seasons';
import { BackdropView } from './BackdropView';

/**
 * Paints the hub's bare grass, with its tint and none of its garden: the ground of the free mode,
 * and what its gate shows while the free mode's code loads.
 */
export function paintHubGround(scene: Phaser.Scene): BackdropView {
  const backdrop = new BackdropView(scene);
  backdrop.paint({ tiles: groundOf(seasonOf('0'), seedOf('hub')), ornaments: [] });
  backdrop.tint(HUB_TINT);
  return backdrop;
}
