import type Phaser from 'phaser';
import { glassPixels } from '../picture/glass';
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

/** A loaded picture as the browser holds it. */
type Source = HTMLImageElement | HTMLCanvasElement;

/**
 * A copy of `cut` recoloured to the glass `colour` (`picture/glass.ts`), as a texture of its own
 * made the first time it is asked for: its key and frame. Null when the sheet did not load.
 */
export function glassFrame(
  textures: Phaser.Textures.TextureManager,
  cut: SheetCut,
  colour: number,
): { readonly key: string; readonly frame: string } | null {
  const key = `glass:${cut.sheet}:${cut.x},${cut.y},${cut.width}x${cut.height}:${colour}`;
  const frame = '__BASE';
  if (textures.exists(key)) return { key, frame };
  if (!textures.exists(cut.sheet)) return null;
  const texture = textures.createCanvas(key, cut.width, cut.height);
  if (texture === null) return null;
  const context = texture.getContext();
  const source = textures.get(cut.sheet).getSourceImage() as Source;
  context.drawImage(source, cut.x, cut.y, cut.width, cut.height, 0, 0, cut.width, cut.height);
  const pixels = context.getImageData(0, 0, cut.width, cut.height);
  pixels.data.set(glassPixels(pixels.data, colour));
  context.putImageData(pixels, 0, 0);
  texture.refresh();
  return { key, frame };
}
