// Which built files the first screen waits for and which load later (plan 07, phase 2), read from
// the manifest Vite writes to dist/.vite/manifest.json. The budget weighs the two apart: the books
// (KaTeX, marked, the entries) load with import() the first time one opens.
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
  /** What loads on demand (dynamic imports, transitively), less what the first screen has already. */
  readonly deferred: string[];
  /** Fonts in older formats that the stylesheets name after woff2: shipped, never fetched. */
  readonly skipped: string[];
}

/**
 * Font formats a stylesheet lists after woff2 for old browsers. Every browser the game runs in
 * takes the woff2, so these are copied to dist/ but never downloaded and never weighed.
 */
const LEGACY_FONT = /\.(?:woff|ttf)$/;

/** Sorts the built files of `manifest` into initial, deferred and skipped. */
export function buildFiles(manifest: ViteManifest): BuildFiles {
  const chunk = (key: string): ViteManifest[string] => {
    const found = manifest[key];
    if (found === undefined) throw new Error(`the manifest imports ${key}, which it does not list`);
    return found;
  };
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry === true);
  if (entries.length === 0) throw new Error('the manifest has no entry chunk');

  // The chunks reachable from `start` through the given kinds of import.
  const reach = (start: string[], dynamic: boolean): Set<string> => {
    const seen = new Set<string>();
    const pending = [...start];
    for (let key = pending.pop(); key !== undefined; key = pending.pop()) {
      if (seen.has(key)) continue;
      seen.add(key);
      const { imports = [], dynamicImports = [] } = chunk(key);
      pending.push(...imports, ...(dynamic ? dynamicImports : []));
    }
    return seen;
  };
  const initialChunks = reach(entries, false);
  const onDemand = [...initialChunks].flatMap((key) => chunk(key).dynamicImports ?? []);
  const deferredChunks = [...reach(onDemand, true)].filter((key) => !initialChunks.has(key));

  // Every file of a set of chunks: its script, its stylesheets and its assets.
  const filesOf = (keys: Iterable<string>): Set<string> =>
    new Set(
      [...keys].flatMap((key) => {
        const { file, css = [], assets = [] } = chunk(key);
        return [file, ...css, ...assets];
      }),
    );
  const initialFiles = filesOf(initialChunks);
  const deferredFiles = [...filesOf(deferredChunks)].filter((file) => !initialFiles.has(file));
  const sorted = (files: Iterable<string>): string[] => [...files].sort();
  return {
    initial: sorted([...initialFiles].filter((file) => !LEGACY_FONT.test(file))),
    deferred: sorted(deferredFiles.filter((file) => !LEGACY_FONT.test(file))),
    skipped: sorted([...initialFiles, ...deferredFiles].filter((file) => LEGACY_FONT.test(file))),
  };
}
