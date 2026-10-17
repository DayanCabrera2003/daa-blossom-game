import type Phaser from 'phaser';
import type { SheetCut } from '../picture/seasons';

/**
 * The name of the frame that shows `cut` in its sheet's texture, added to the texture the first
 * time it is asked for, so a piece of several tiles draws as one image. Null when the sheet did not
 * load: whoever draws it leaves it out, and the game goes on without it.
 */
export function cutFrame(textures: Phaser.Textures.TextureManager, cut: SheetCut): string | null {
  if (!textures.exists(cut.sheet)) return null;
  const name = `cut:${cut.x},${cut.y},${cut.width}x${cut.height}`;
  const texture = textures.get(cut.sheet);
  if (!texture.has(name)) texture.add(name, 0, cut.x, cut.y, cut.width, cut.height);
  return name;
}
