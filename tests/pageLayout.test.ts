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

  // Phaser centres the canvas in the box of its parent, the body. Left as tall as its content, the
  // body would hug a canvas a zoom smaller than the window (beside the open teacher's panel) and
  // leave it at the top. As tall as the window, and a block of its own so the canvas's top margin
  // never escapes it (which would push the page down and make it scroll), the canvas centres.
  it('makes the body as tall as the window, so the canvas centres in it', () => {
    expect(page).toMatch(/body\s*\{[^}]*min-height:\s*100vh;[^}]*\}/);
    expect(page).toMatch(/body\s*\{[^}]*display:\s*flow-root;[^}]*\}/);
  });
});
