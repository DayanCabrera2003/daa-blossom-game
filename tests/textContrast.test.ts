import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assetEntry } from '../src/game/assets/keys';
import { BACKDROP } from '../src/game/picture/backdrop';
import { HUB_TINT } from '../src/game/picture/hubGarden';
import { SEASONS, seasonOf, type Season } from '../src/game/picture/seasons';
import { NAME_OUTLINE } from '../src/game/picture/sproutName';
import {
  blend,
  MIN_TEXT_CONTRAST,
  TEXTS,
  textReads,
  type Backdrop,
  type TextOnSurface,
} from '../src/game/picture/textContrast';
import { WOOD_BUTTON, WOOD_DIALOGUE, WOOD_PANEL, type WoodPiece } from '../src/game/picture/wood';
import { PALETTE } from '../src/game/view/palette';
import { pngPixels } from '../tools/assets/pngColours';

// Every text of the canvas against what it is written on (plan 09, phase 6), measured on the real
// pixels: the faces of the pack's wood, and the grass, water and snow of the backdrops as the game
// draws them (faint, tinted by the season at noon, its brightest hour, over the canvas's dark).
// Each pair reaches the contrast WCAG asks of body text.

/** The pixels of a picture the game serves, read once each. */
const pictures = new Map<string, (x: number, y: number) => number | null>();
function pixelsOf(
  texture: Parameters<typeof assetEntry>[0],
): (x: number, y: number) => number | null {
  const { path } = assetEntry(texture);
  const read = pictures.get(path) ?? pngPixels(new Uint8Array(readFileSync(`public/${path}`)));
  pictures.set(path, read);
  return read;
}

/** The colour of a wooden piece's face at `at` (its own face by default). */
function faceOf(piece: WoodPiece, at = piece.face): number {
  const colour = pixelsOf(piece.texture)(at.x, at.y);
  if (colour === null) throw new Error(`${piece.texture} is transparent at its face`);
  return colour;
}

/** `colour` multiplied by `tint`, channel by channel, as a tinted image is drawn. */
const multiply = (colour: number, tint: number): number =>
  [16, 8, 0].reduce(
    (out, shift) =>
      out | (Math.round((((colour >> shift) & 0xff) * ((tint >> shift) & 0xff)) / 255) << shift),
    0,
  );

/** Every colour of a season's ground, tinted by `tint` and drawn faint over the canvas. */
function groundOf(season: Season, tint: number): number[] {
  const colours = new Set<number>();
  const cuts = [...season.ground.block.flat(), ...season.ground.sprinkles];
  for (const cut of cuts) {
    const read = pixelsOf(cut.sheet);
    for (let y = 0; y < cut.height; y += 1) {
      for (let x = 0; x < cut.width; x += 1) {
        const colour = read(cut.x + x, cut.y + y);
        if (colour !== null)
          colours.add(blend(multiply(colour, tint), BACKDROP.alpha, PALETTE.background));
      }
    }
  }
  return [...colours];
}

/** The colours of each backdrop. */
const BACKDROPS: Record<Backdrop, number[]> = {
  hub: groundOf(seasonOf('0'), HUB_TINT),
  levels: SEASONS.flatMap((season) => groundOf(season, season.tint)),
  canvas: [PALETTE.background],
};

/** Every colour a text may lie on. */
function groundsOf({ surface, outlined }: TextOnSurface): number[] {
  if (outlined) return [PALETTE[NAME_OUTLINE.colour]];
  switch (surface.kind) {
    case 'wood':
      if (surface.piece === 'panel') return [faceOf(WOOD_PANEL)];
      if (surface.piece === 'dialogue') return [faceOf(WOOD_DIALOGUE)];
      if (surface.piece === 'dialogueTab') return [faceOf(WOOD_DIALOGUE, WOOD_DIALOGUE.tab.face)];
      return [faceOf(WOOD_BUTTON[surface.piece])];
    case 'backdrop':
      return BACKDROPS[surface.of];
    case 'fill':
      return BACKDROPS[surface.over].map((under) =>
        blend(PALETTE[surface.colour], surface.alpha, under),
      );
  }
}

/** The source files under `dir`, tests aside. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('the contrast of every text on what it is written on', () => {
  it('there are grounds to measure: the hub, every season, the canvas', () => {
    expect(BACKDROPS.hub.length).toBeGreaterThan(0);
    expect(BACKDROPS.levels.length).toBeGreaterThanOrEqual(SEASONS.length);
  });

  it.each(TEXTS.map((entry) => [`${entry.file}: ${entry.what}`, entry] as const))(
    '%s reads with contrast enough',
    (_, entry) => {
      expect(textReads(PALETTE[entry.text], groundsOf(entry))).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      );
    },
  );

  it('text straight on a backdrop wears the outline, for an ornament of any colour may be under it', () => {
    const bare = TEXTS.filter(
      (entry) =>
        entry.surface.kind === 'backdrop' && entry.surface.of !== 'canvas' && !entry.outlined,
    ).map((entry) => `${entry.file}: ${entry.what}`);
    expect(bare).toEqual([]);
  });

  it('lists every file of the game that writes text, and only those', () => {
    const writing = sources('src/game')
      .filter((path) => !path.endsWith('textStyle.ts') && !path.endsWith('OutlinedText.ts'))
      .filter((path) => readFileSync(path, 'utf8').includes('textStyle('))
      .map((path) => path.slice('src/game/'.length).replaceAll('\\', '/'))
      .sort();
    expect([...new Set(TEXTS.map((entry) => entry.file))].sort()).toEqual(writing);
  });
});
