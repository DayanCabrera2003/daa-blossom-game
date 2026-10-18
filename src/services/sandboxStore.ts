import { z } from 'zod';
import { sproutKind } from '@levels/fields';
// Only the type: the free mode's code loads on demand and never reaches the initial script.
import type { Design } from '@levels/sandbox/design';
import type { KeyValueStore } from './save';

/** Where the last garden designed in the free mode is kept, apart from the progress. */
export const SANDBOX_KEY = 'florecer.sandbox';

const SANDBOX_VERSION = 1 as const;

/** A vine or a lantern between two named sprouts. */
const pair = z.tuple([z.string(), z.string()]);

/**
 * A kept design, read as the editor wrote it: sprouts with distinct names, and vines and lanterns
 * only between them. The free mode's limits (how many, how far apart) are the editor's to hold when
 * it opens the design, with the rest of its code.
 */
const designSchema = z
  .strictObject({
    sprouts: z.array(
      z.strictObject({
        label: z.string(),
        x: z.number(),
        y: z.number(),
        kind: sproutKind.exactOptional(),
      }),
    ),
    vines: z.array(pair),
    lanterns: z.array(pair),
  })
  .refine(({ sprouts, vines, lanterns }) => {
    const names = new Set(sprouts.map((sprout) => sprout.label));
    return (
      names.size === sprouts.length &&
      [...vines, ...lanterns].every(([u, v]) => names.has(u) && names.has(v))
    );
  });

const storedSchema = z.strictObject({ version: z.literal(SANDBOX_VERSION), design: designSchema });

/** The design with nothing in it (the free mode's `EMPTY_DESIGN`, which loads with its code). */
const empty = (): Design => ({ sprouts: [], vines: [], lanterns: [] });

/** The last garden designed in the free mode, read once and written on every change. */
export interface SandboxStore {
  /** The design as it is now. */
  get(): Design;
  /** Replaces the design and writes it. */
  set(design: Design): void;
}

/** Reads the kept design; anything unreadable (none, damaged, another version) is the empty one. */
function loadDesign(storage: KeyValueStore): Design {
  try {
    const raw = storage.getItem(SANDBOX_KEY);
    if (raw === null) return empty();
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.design : empty();
  } catch {
    return empty();
  }
}

/**
 * Opens the free mode's design kept in `storage` (plan 08, section 0: "lo vivido se guarda" apart).
 * It has a key of its own and never reads nor writes the progress, so a broken design can never
 * damage it; a broken one is read as the empty design. If the browser refuses to store it, the
 * design lasts for this session only.
 */
export function createSandboxStore(storage: KeyValueStore): SandboxStore {
  let current = loadDesign(storage);
  return {
    get: () => current,
    set(design) {
      current = design;
      try {
        storage.setItem(SANDBOX_KEY, JSON.stringify({ version: SANDBOX_VERSION, design }));
      } catch {
        // Storage refused (private mode, quota): the design lives only for this session.
      }
    },
  };
}
