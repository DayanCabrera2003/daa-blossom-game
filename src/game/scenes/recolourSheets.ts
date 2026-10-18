import type Phaser from 'phaser';
import type { Recolour } from '../assets/loadPlan';
import { sheetGrid } from '../assets/sheetGrid';
import { imageColours } from '../picture/imageColours';
import { recolourPixels } from '../picture/recolourPixels';

/** A loaded picture as the browser holds it. */
type Source = HTMLImageElement | HTMLCanvasElement;

/** A canvas holding a copy of `source`, its 2D context and its pixels. */
interface Copy {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly pixels: ImageData;
}

/** Copies `source` onto a new canvas, to read and rewrite its pixels. */
function copyOf(source: Source): Copy {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) throw new Error('the browser gave no 2D canvas to read a picture with');
  context.drawImage(source, 0, 0);
  return { canvas, context, pixels: context.getImageData(0, 0, canvas.width, canvas.height) };
}

/** The picture a loaded texture was made from. */
const sourceOf = (textures: Phaser.Textures.TextureManager, key: string): Source =>
  textures.get(key).getSourceImage() as Source;

/** The colours of the palette swatch loaded under `key` (Ninja Adventure's `Palette.png`). */
export function paletteFrom(textures: Phaser.Textures.TextureManager, key: string): number[] {
  return imageColours(copyOf(sourceOf(textures, key)).pixels.data);
}

/**
 * Turns each raw Kenney picture into a canvas texture under its own key, with every colour moved
 * to its nearest in `palette` (`game/picture/recolourPixels.ts` decides), cut into the frames a
 * sprite sheet of that frame size would have. The raw texture is dropped afterwards. A picture that
 * failed to load is skipped, so the game still starts, only without it.
 */
export function recolourSheets(
  textures: Phaser.Textures.TextureManager,
  recolours: readonly Recolour[],
  palette: readonly number[],
): void {
  for (const { key, rawKey, frame } of recolours) {
    if (!textures.exists(rawKey) || textures.exists(key)) continue;
    const { canvas, context, pixels } = copyOf(sourceOf(textures, rawKey));
    pixels.data.set(recolourPixels(pixels.data, palette));
    context.putImageData(pixels, 0, 0);
    const texture = textures.addCanvas(key, canvas);
    if (texture !== null && frame !== null) {
      for (const cell of sheetGrid(canvas, frame)) {
        texture.add(cell.index, 0, cell.x, cell.y, cell.width, cell.height);
      }
    }
    textures.remove(rawKey);
  }
}
