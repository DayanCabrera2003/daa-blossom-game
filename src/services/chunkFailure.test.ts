import { describe, expect, it } from 'vitest';
import { chunkNotice, isChunkLoadError, LAZY_PARTS } from './chunkFailure';

// What each browser says when an import() cannot fetch its chunk, word for word.
const CHROME = new TypeError(
  'Failed to fetch dynamically imported module: https://example.org/game/assets/books-1a2b.js',
);
const FIREFOX = new TypeError(
  'error loading dynamically imported module: https://example.org/x.js',
);
const SAFARI = new TypeError('Importing a module script failed.');
const VITE_CSS = new Error('Unable to preload CSS for /game/assets/books-1a2b.css');

describe('a part of the game that did not load', () => {
  it('is told apart from a bug, in the words of every browser', () => {
    for (const error of [CHROME, FIREFOX, SAFARI, VITE_CSS]) {
      expect(isChunkLoadError(error)).toBe(true);
    }
    expect(
      isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'x')")),
    ).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('offline, asks to check the connection', () => {
    expect(chunkNotice(CHROME, { online: false, pageAnswered: false })).toBe('offline');
    // The browser may think itself online while nothing answers.
    expect(chunkNotice(SAFARI, { online: true, pageAnswered: false })).toBe('offline');
  });

  it('with the page answering, its chunk is gone: a new version was published, reload', () => {
    expect(chunkNotice(FIREFOX, { online: true, pageAnswered: true })).toBe('updated');
    expect(chunkNotice(VITE_CSS, { online: true, pageAnswered: true })).toBe('updated');
  });

  it('a bug in a part that did load is no notice: it stays in the console', () => {
    const bug = new RangeError('Maximum call stack size exceeded');
    expect(chunkNotice(bug, { online: true, pageAnswered: true })).toBeNull();
    expect(chunkNotice(bug, { online: false, pageAnswered: false })).toBeNull();
  });

  it('names the parts that load on demand', () => {
    expect([...LAZY_PARTS].sort()).toEqual(['books', 'credits', 'sandbox', 'share']);
  });
});
