import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BOOT_KEYS } from '../src/game/assets/loadPlan';
import { assetEntry, keysOfKind } from '../src/game/assets/keys';

// The font is the one asset the game does not hand to Phaser's loader: the page declares it with
// @font-face and waits for it. So it must be served from public/ at a path relative to the page,
// which keeps working under the GitHub Pages sub-path, and be a real TrueType file.

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

describe('the font file', () => {
  const fonts = keysOfKind('font');

  it('is one font, loaded with the boot group', () => {
    expect(fonts).toEqual(['font.monogram']);
    expect(BOOT_KEYS).toContain('font.monogram');
  });

  it.each(fonts)('%s is served from public/assets/fonts at a path relative to the page', (key) => {
    const { path } = assetEntry(key);
    expect(path).toMatch(/^assets\/fonts\/[^/]+\.ttf$/);
  });

  it.each(fonts)('%s is a TrueType file', (key) => {
    const bytes = readFileSync(join(PUBLIC, assetEntry(key).path));
    expect([...bytes.subarray(0, 4)]).toEqual([0x00, 0x01, 0x00, 0x00]);
  });
});
