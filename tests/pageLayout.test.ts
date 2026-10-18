import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The canvas is sized to a whole zoom of the window (game/scale/integerZoom.ts). Left inline, it
// would sit on a text baseline and make the page a few pixels taller than the window, so a
// window exactly a zoom multiple would scroll and cut the bottom row of the HUD.

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('the page around the canvas', () => {
  it('lays the canvas out as a block, never on a text baseline', () => {
    expect(page).toMatch(/canvas\s*\{[^}]*display:\s*block;[^}]*\}/);
  });

  it('leaves no margin around the page', () => {
    expect(page).toMatch(/body\s*\{[^}]*margin:\s*0;[^}]*\}/);
  });
});
