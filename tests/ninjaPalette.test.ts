import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetEntry } from '../src/game/assets/keys';
import { NINJA_PALETTE } from '../src/game/picture/ninjaPalette';
import { pngColours } from '../tools/assets/pngColours';

// The palette written in code is the pack's own sheet, colour for colour and in its order, so a
// colour cannot creep into the list without being in Palette.png (plan 06, section 1.1).

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

describe('the Ninja Adventure palette in code', () => {
  it('is exactly the colours of the committed Palette.png, in reading order', () => {
    const sheet = new Uint8Array(readFileSync(join(PUBLIC, assetEntry('image.palette').path)));
    expect(NINJA_PALETTE).toEqual(pngColours(sheet));
  });
});
