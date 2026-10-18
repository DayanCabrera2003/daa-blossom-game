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

/**
 * The synthetic manifest with the free mode as well: the entry loads it on demand too, and it
 * imports the shared chunk (already initial), a chunk of its own, and the garden code it shares
 * with the books.
 */
const WITH_FREE_MODE = parseViteManifest({
  ...MANIFEST,
  'index.html': {
    ...MANIFEST['index.html'],
    file: 'assets/index.js',
    dynamicImports: ['src/ui/books.ts', 'src/levels/sandbox/entry.ts'],
  },
  'src/ui/books.ts': {
    ...MANIFEST['src/ui/books.ts'],
    file: 'assets/books.js',
    imports: ['_shared.js', '_katex.js', '_code.js'],
  },
  'src/levels/sandbox/entry.ts': {
    file: 'assets/sandbox.js',
    isDynamicEntry: true,
    imports: ['_shared.js', '_design.js', '_code.js'],
  },
  '_design.js': { file: 'assets/design.js' },
  '_code.js': { file: 'assets/code.js', imports: ['_shared.js'] },
});

/** Whether a chunk's key names a source of the free mode. */
const freeMode = (key: string): boolean => key.startsWith('src/levels/sandbox/');

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

  it('weighs the free mode apart from the books: what its own dynamic imports load', () => {
    const files = buildFiles(WITH_FREE_MODE, freeMode);
    expect(files.freeMode).toEqual(['assets/code.js', 'assets/design.js', 'assets/sandbox.js']);
    expect(files.deferred).not.toContain('assets/sandbox.js');
    expect(files.deferred).not.toContain('assets/design.js');
  });

  it('counts what the books and the free mode share in both, and nothing the start has', () => {
    const files = buildFiles(WITH_FREE_MODE, freeMode);
    expect(files.deferred).toContain('assets/code.js');
    expect(files.freeMode).not.toContain('assets/shared.js');
  });

  it('leaves the free mode empty when no chunk is said to be of it', () => {
    expect(buildFiles(WITH_FREE_MODE).freeMode).toEqual([]);
    expect(buildFiles(MANIFEST, freeMode).freeMode).toEqual([]);
    expect(buildFiles(WITH_FREE_MODE).deferred).toContain('assets/sandbox.js');
  });
});
