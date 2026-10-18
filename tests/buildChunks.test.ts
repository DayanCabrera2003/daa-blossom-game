import { describe, expect, it } from 'vitest';
import { buildFiles, parseViteManifest } from '../tools/assets/buildChunks';

/**
 * A synthetic Vite manifest: the entry imports a shared chunk (which imports a vendor chunk) and
 * loads the books on demand; the books import the shared chunk and KaTeX, carry a stylesheet and
 * fonts, and load the teacher panel on demand, which imports KaTeX as well.
 */
const MANIFEST = parseViteManifest({
  'index.html': {
    file: 'assets/index.js',
    src: 'index.html',
    isEntry: true,
    imports: ['_shared.js'],
    dynamicImports: ['src/ui/books.ts'],
    css: ['assets/index.css'],
  },
  '_shared.js': { file: 'assets/shared.js', imports: ['_vendor.js'] },
  '_vendor.js': { file: 'assets/vendor.js' },
  'src/ui/books.ts': {
    file: 'assets/books.js',
    src: 'src/ui/books.ts',
    isDynamicEntry: true,
    imports: ['_shared.js', '_katex.js'],
    dynamicImports: ['src/ui/teacher.ts'],
    css: ['assets/books.css'],
    assets: ['assets/KaTeX_Main.woff2', 'assets/KaTeX_Main.woff', 'assets/KaTeX_Main.ttf'],
  },
  '_katex.js': { file: 'assets/katex.js', imports: ['_shared.js'] },
  'src/ui/teacher.ts': {
    file: 'assets/teacher.js',
    isDynamicEntry: true,
    imports: ['_katex.js'],
  },
  'node_modules/katex/dist/fonts/KaTeX_Main.woff2': { file: 'assets/KaTeX_Main.woff2' },
});

describe('buildFiles', () => {
  it('counts as initial the entry and everything it imports statically, transitively', () => {
    expect(buildFiles(MANIFEST).initial).toEqual([
      'assets/index.css',
      'assets/index.js',
      'assets/shared.js',
      'assets/vendor.js',
    ]);
  });

  it('counts as deferred what loads on demand, its stylesheets and its woff2 fonts', () => {
    expect(buildFiles(MANIFEST).deferred).toEqual([
      'assets/KaTeX_Main.woff2',
      'assets/books.css',
      'assets/books.js',
      'assets/katex.js',
      'assets/teacher.js',
    ]);
  });

  it('never counts a shared chunk twice, nor a deferred import of an initial chunk as deferred', () => {
    const { initial, deferred } = buildFiles(MANIFEST);
    expect(deferred.filter((file) => initial.includes(file))).toEqual([]);
    expect(new Set(deferred).size).toBe(deferred.length);
  });

  it('lists apart, without counting them, the older font formats no modern browser fetches', () => {
    expect(buildFiles(MANIFEST).skipped).toEqual([
      'assets/KaTeX_Main.ttf',
      'assets/KaTeX_Main.woff',
    ]);
  });

  it('refuses a manifest whose chunks import a chunk it does not list', () => {
    const broken = parseViteManifest({
      'index.html': { file: 'assets/index.js', isEntry: true, imports: ['_missing.js'] },
    });
    expect(() => buildFiles(broken)).toThrow('_missing.js');
  });

  it('refuses a manifest without an entry, or that is not a manifest', () => {
    expect(() => buildFiles(parseViteManifest({ a: { file: 'a.js' } }))).toThrow('entry');
    expect(() => parseViteManifest({ a: { imports: [] } })).toThrow();
  });
});
