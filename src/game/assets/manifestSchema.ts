import { z } from 'zod';

/**
 * What an extracted file is, which says how the game loads it: a plain image, a sheet cut into
 * frames of a fixed size, the font, a looping music track, a sound effect, a babble syllable or a
 * jingle.
 */
export const ASSET_KINDS = ['image', 'sheet', 'font', 'music', 'sfx', 'voice', 'jingle'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/**
 * When a file is loaded: `boot` before the hub (art, effects, syllables, jingles and the hub's
 * music), a chapter group when entering one of its levels (its music), and `credits` for the
 * credits screen.
 */
export const LOAD_GROUPS = [
  'boot',
  'ch0',
  'ch1',
  'ch2',
  'ch3',
  'ch4',
  'ch5',
  'ch6',
  'ch7',
  'credits',
] as const;
export type LoadGroup = (typeof LOAD_GROUPS)[number];

/** A width and height in pixels. */
const size = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** A third-party pack the files come from, as its credits name it. */
const packSchema = z.strictObject({
  name: z.string().min(1),
  /** The version the pack states, or null when it states none. */
  version: z.string().min(1).nullable(),
  author: z.string().min(1),
  /** An SPDX license id, e.g. `CC0-1.0`. */
  license: z.string().min(1),
  url: z.url(),
});

/** One extracted file, as the game needs it to load and the tests need it to check it. */
const entrySchema = z.strictObject({
  /** Where the file is served from, relative to the page: always under `assets/`. */
  path: z.string().regex(/^assets\/[^\s]+$/),
  kind: z.enum(ASSET_KINDS),
  group: z.enum(LOAD_GROUPS),
  /** The id of its pack in `packs`. */
  pack: z.string().min(1),
  /** The file it was extracted from, inside the pack. */
  source: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  /** Images and sheets: the size of the whole picture. */
  image: size.optional(),
  /** Sheets: the size of one frame. */
  frame: size.optional(),
});

const manifestSchema = z
  .strictObject({
    packs: z.record(z.string(), packSchema),
    assets: z.record(z.string(), entrySchema),
  })
  .superRefine((manifest, context) => {
    for (const [key, entry] of Object.entries(manifest.assets)) {
      if (!(entry.pack in manifest.packs)) {
        context.addIssue({
          code: 'custom',
          path: ['assets', key, 'pack'],
          message: `${key} comes from ${entry.pack}, which is not among the packs`,
        });
      }
    }
  });

export type PackCredit = z.infer<typeof packSchema>;
export type ManifestEntry = z.infer<typeof entrySchema>;
export type Manifest = z.infer<typeof manifestSchema>;

/** Validates a manifest read from JSON; throws, saying what is wrong, when it is malformed. */
export function parseManifest(json: unknown): Manifest {
  return manifestSchema.parse(json);
}
