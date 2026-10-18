import type Phaser from 'phaser';
import type { AssetKey } from '../assets/keys';
import { frameRect, type FrameName } from '../assets/frames';
import { sheetGrid } from '../assets/sheetGrid';
import {
  AMBER_LANTERN,
  POND_RIPPLES,
  SILVER_LANTERN,
  swapColours,
  type ColourSwaps,
} from '../picture/swapColours';

/**
 * The textures the garden pieces make from pack sprites with their colours swapped
 * (`picture/swapColours.ts` decides which): the lantern in amber and in silver, and the ripples on
 * the pond's water. Each is made once, the first time a view asks, from a texture the preload
 * scene loaded; a sprite that failed to load leaves its texture missing, and the views draw
 * without it.
 */
export const PIECE_TEXTURES = {
  amberLantern: 'piece.amberLantern',
  silverLantern: 'piece.silverLantern',
  pondRipples: 'piece.pondRipples',
} as const;

/** One texture to make: from which loaded sprite, which part of it, and with which swaps. */
interface Recipe {
  readonly key: string;
  readonly source: AssetKey;
  /** A named frame to cut out, or null for the whole sheet. */
  readonly frame: FrameName | null;
  /** The frame size to cut the result into, for a sheet. */
  readonly cells: { readonly width: number; readonly height: number } | null;
  readonly swaps: ColourSwaps;
}

const RECIPES: readonly Recipe[] = [
  {
    key: PIECE_TEXTURES.amberLantern,
    source: 'actor.lantern',
    frame: 'lanternBack',
    cells: null,
    swaps: AMBER_LANTERN,
  },
  {
    key: PIECE_TEXTURES.silverLantern,
    source: 'actor.lantern',
    frame: 'lanternBack',
    cells: null,
    swaps: SILVER_LANTERN,
  },
  {
    key: PIECE_TEXTURES.pondRipples,
    source: 'anim.waterRipples',
    frame: null,
    cells: { width: 16, height: 16 },
    swaps: POND_RIPPLES,
  },
];

/** Makes one texture of `recipe` on a canvas, cut into frames when it is a sheet. */
function make(textures: Phaser.Textures.TextureManager, recipe: Recipe): void {
  const image = textures.get(recipe.source).getSourceImage() as HTMLImageElement;
  const rect =
    recipe.frame === null
      ? { x: 0, y: 0, width: image.width, height: image.height }
      : frameRect(recipe.frame);
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) return;
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  const pixels = context.getImageData(0, 0, rect.width, rect.height);
  pixels.data.set(swapColours(pixels.data, recipe.swaps));
  context.putImageData(pixels, 0, 0);
  const texture = textures.addCanvas(recipe.key, canvas);
  if (texture === null || recipe.cells === null) return;
  for (const cell of sheetGrid(canvas, recipe.cells))
    texture.add(cell.index, 0, cell.x, cell.y, cell.width, cell.height);
}

/** Makes every piece texture not made yet whose sprite is loaded. */
export function ensurePieceTextures(textures: Phaser.Textures.TextureManager): void {
  for (const recipe of RECIPES) {
    if (textures.exists(recipe.key) || !textures.exists(recipe.source)) continue;
    make(textures, recipe);
  }
}
