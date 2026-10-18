import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DEFERRED_LIBRARIES, librariesIn } from '../tools/assets/deferredLibraries';

/** The text of an installed package's file, found the way Node resolves it. */
const packageText = (specifier: string): string =>
  readFileSync(createRequire(import.meta.url).resolve(specifier), 'utf8');

describe('librariesIn', () => {
  it('finds each heavy library in its own code, by a text minifiers keep', () => {
    expect(librariesIn(packageText('katex'))).toEqual(['katex']);
    expect(librariesIn(packageText('marked'))).toEqual(['marked']);
  });

  it('finds none in a script without them, and both in one that bundles both', () => {
    expect(librariesIn('const a = "garden";')).toEqual([]);
    const both = Object.values(DEFERRED_LIBRARIES).join(';');
    expect(librariesIn(both)).toEqual(['katex', 'marked']);
  });
});
