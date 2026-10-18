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

// On a phone or a tablet (plan 09, phase 7): a touch on the canvas is the game's, never the
// browser's (no scrolling, no zoom on a double tap, no selection, no callout, no flash of the tap);
// the books keep the browser's scrolling but zoom on no double tap either, the page never bounces
// past its ends, and no text is inflated when the phone is turned. Pinching to zoom stays allowed.
describe('the page under a finger', () => {
  /** The declarations of the rule whose selector list is exactly `selector` (spaces aside). */
  const rule = (selector: string): string => {
    const style = /<style>([^]*)<\/style>/.exec(page)?.[1] ?? '';
    for (const [, head = '', body = ''] of style.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
      const names = head.replace(/\/\*[^]*?\*\//g, '').replace(/\s+/g, '');
      if (names === selector) return body;
    }
    return '';
  };

  it('gives every touch on the canvas to the game', () => {
    const canvas = rule('canvas');
    expect(canvas).toMatch(/touch-action:\s*none;/);
    expect(canvas).toMatch(/(^|[^-])user-select:\s*none;/);
    expect(canvas).toMatch(/-webkit-user-select:\s*none;/);
    expect(canvas).toMatch(/-webkit-touch-callout:\s*none;/);
    expect(canvas).toMatch(/-webkit-tap-highlight-color:\s*transparent;/);
  });

  it('zooms the page on no double tap, never bounces it, and never inflates its text', () => {
    const root = rule('html,body');
    expect(root).toMatch(/touch-action:\s*manipulation;/);
    expect(root).toMatch(/overscroll-behavior:\s*none;/);
    expect(root).toMatch(/-webkit-text-size-adjust:\s*100%;/);
    expect(root).toMatch(/(^|[^-])text-size-adjust:\s*100%;/);
  });

  it("is as tall as the window a phone's bars leave", () => {
    expect(rule('body')).toMatch(/min-height:\s*100dvh;/);
  });

  it('lets a reader pinch to zoom', () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(page)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/);
  });
});
