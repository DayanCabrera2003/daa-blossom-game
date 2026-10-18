import { z } from 'zod';

/**
 * The audio fallbacks (plan 09, phase 8): Safari before 18.4 cannot decode the Ogg container, so
 * each Ogg Vorbis sound has a copy in AAC (`.m4a`) made from the same file by a system encoder
 * (`npm run assets:fallbacks`). Generated next to the manifest, apart from it: the manifest is the
 * same bytes on every run of `npm run assets`, an encoder's output is not across its versions.
 */

/** One fallback: where it is served from, the original it was made from, and its size. */
const fallbackSchema = z.strictObject({
  /** Relative to the page, under `assets/`, like the manifest's paths. */
  path: z.string().regex(/^assets\/[^\s]+$/),
  /** The sha256 of the original it was converted from, as the manifest gives it. */
  from: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nonnegative(),
});

/** The table: the encoder and its version that made the copies, and each copy by its sound's key. */
const fallbacksSchema = z.strictObject({
  encoder: z.string().min(1),
  files: z.record(z.string(), fallbackSchema),
});

export type Fallback = z.infer<typeof fallbackSchema>;
export type Fallbacks = z.infer<typeof fallbacksSchema>;

/** Validates the table read from JSON; throws, saying what is wrong, when it is malformed. */
export function parseFallbacks(json: unknown): Fallbacks {
  return fallbacksSchema.parse(json);
}
