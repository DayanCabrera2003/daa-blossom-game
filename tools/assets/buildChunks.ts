// Which built files the first screen waits for and which load later (plan 07, phase 2), read from
// the manifest Vite writes to dist/.vite/manifest.json. The budget weighs the two apart: the books
// (KaTeX, marked, the entries) load with import() the first time one opens. The free mode (plan 08,
// phase 9) loads on demand as well, and is weighed apart from the books; so is the level screen,
// which loads behind its thin gate the first time a level opens.
import { z } from 'zod';

/** One chunk of Vite's manifest, as far as the budget reads it; keys name other chunks. */
const chunkSchema = z.object({
  file: z.string(),
  isEntry: z.boolean().optional(),
  imports: z.array(z.string()).optional(),
  dynamicImports: z.array(z.string()).optional(),
  css: z.array(z.string()).optional(),
  assets: z.array(z.string()).optional(),
});

const manifestSchema = z.record(z.string(), chunkSchema);

/** Vite's build manifest: each chunk (and each emitted asset) by its key. */
export type ViteManifest = z.infer<typeof manifestSchema>;

/** Checks that `json` has the shape of a Vite manifest. */
export function parseViteManifest(json: unknown): ViteManifest {
  return manifestSchema.parse(json);
}

/** The built files sorted by when they load, each listed once; paths are relative to dist/. */
export interface BuildFiles {
  /** The entry and its static imports, transitively, with their stylesheets and assets. */
  readonly initial: string[];
  /**
   * What loads on demand (dynamic imports, transitively), less what the first screen has already:
   * the books and every other dynamic import that is neither the free mode's nor the level screen's.
   */
  readonly deferred: string[];
  /**
   * What opening the free mode loads: its dynamic imports, transitively, less what the first screen
   * has already. A chunk it shares with the books is listed in both, as either downloads it.
   */
  readonly freeMode: string[];
  /**
   * What opening a level loads: the level screen's dynamic imports, transitively, less what the
   * first screen has already. A chunk it shares with another part is listed in both.
   */
  readonly level: string[];
  /** Fonts in older formats that the stylesheets name after woff2: shipped, never fetched. */
  readonly skipped: string[];
}

/**
 * Font formats a stylesheet lists after woff2 for old browsers. Every browser the game runs in
 * takes the woff2, so these are copied to dist/ but never downloaded and never weighed.
 */
const LEGACY_FONT = /\.(?:woff|ttf)$/;

/** The parts of the build that load on demand, each weighed apart. */
type LaterPart = 'deferred' | 'freeMode' | 'level';

/**
 * Sorts the built files of `manifest` into initial, deferred, the free mode's, the level screen's
 * and skipped. A chunk loaded on demand belongs to the free mode when `isFreeMode` says so of its
 * key (the source path of a dynamic entry), and to the level screen when `isLevel` does; with no
 * such test, nothing does. A part's weight follows its own dynamic imports but stops at another
 * part's entry: the free mode plays its gardens on the level screen, which loads only then.
 */
export function buildFiles(
  manifest: ViteManifest,
  isFreeMode: (key: string) => boolean = () => false,
  isLevel: (key: string) => boolean = () => false,
): BuildFiles {
  const chunk = (key: string): ViteManifest[string] => {
    const found = manifest[key];
    if (found === undefined) throw new Error(`the manifest imports ${key}, which it does not list`);
    return found;
  };
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry === true);
  if (entries.length === 0) throw new Error('the manifest has no entry chunk');

  // The part a dynamic entry loads in.
  const partOf = (key: string): LaterPart => {
    if (isFreeMode(key)) return 'freeMode';
    return isLevel(key) ? 'level' : 'deferred';
  };
  // The chunks reachable from `start` through static imports and, for a part, its dynamic ones,
  // except those that start another part (the free mode or the level screen) of their own.
  const reach = (start: string[], part: LaterPart | null): Set<string> => {
    const seen = new Set<string>();
    const pending = [...start];
    for (let key = pending.pop(); key !== undefined; key = pending.pop()) {
      if (seen.has(key)) continue;
      seen.add(key);
      const { imports = [], dynamicImports = [] } = chunk(key);
      const own =
        part === null
          ? []
          : dynamicImports.filter((next) => [part, 'deferred'].includes(partOf(next)));
      pending.push(...imports, ...own);
    }
    return seen;
  };
  const initialChunks = reach(entries, null);
  const onDemand = [...initialChunks].flatMap((key) => chunk(key).dynamicImports ?? []);
  // What the on-demand entries of a part load, transitively, that the first screen does not have.
  const later = (part: LaterPart): string[] =>
    [
      ...reach(
        onDemand.filter((key) => partOf(key) === part),
        part,
      ),
    ].filter((key) => !initialChunks.has(key));
  const deferredChunks = later('deferred');
  const freeModeChunks = later('freeMode');
  const levelChunks = later('level');

  // Every file of a set of chunks: its script, its stylesheets and its assets.
  const filesOf = (keys: Iterable<string>): Set<string> =>
    new Set(
      [...keys].flatMap((key) => {
        const { file, css = [], assets = [] } = chunk(key);
        return [file, ...css, ...assets];
      }),
    );
  const initialFiles = filesOf(initialChunks);
  const laterFiles = (keys: string[]): string[] =>
    [...filesOf(keys)].filter((file) => !initialFiles.has(file));
  const deferredFiles = laterFiles(deferredChunks);
  const freeModeFiles = laterFiles(freeModeChunks);
  const levelFiles = laterFiles(levelChunks);
  const sorted = (files: Iterable<string>): string[] => [...new Set(files)].sort();
  const fetched = (files: Iterable<string>): string[] =>
    sorted([...files].filter((file) => !LEGACY_FONT.test(file)));
  return {
    initial: fetched(initialFiles),
    deferred: fetched(deferredFiles),
    freeMode: fetched(freeModeFiles),
    level: fetched(levelFiles),
    skipped: sorted(
      [...initialFiles, ...deferredFiles, ...freeModeFiles, ...levelFiles].filter((file) =>
        LEGACY_FONT.test(file),
      ),
    ),
  };
}
