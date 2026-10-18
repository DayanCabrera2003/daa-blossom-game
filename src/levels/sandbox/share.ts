import { encodeGarden } from '@core/codes/gardenCode';
import { unwrap } from '@core/shared/result';
import { buildGarden } from '../garden';
import type { Design } from './design';
import { toLevelFile } from './toLevel';

/**
 * What the free mode offers to share of a design (plan 08, phase 14): its garden code, short and
 * canonical, which carries the sprouts, the vines and the lanterns but neither places nor names;
 * and the design as a level file, the very JSON of `levels/data/`, written out with both. An empty
 * design has nothing to share. Every other design the editor makes is a garden and a level (the
 * reducer keeps it so; `toLevel.test.ts` holds it to every check of the catalog).
 */

/** A design ready to share: its code and its level file, each null when there is none. */
export interface SharedGarden {
  readonly code: string | null;
  readonly json: string | null;
}

/** How deep the level file is indented, so a reader who opens it finds one field per line. */
const INDENT = 2;

/** The code and the level file of `design`. */
export function shareOf(design: Design): SharedGarden {
  if (design.sprouts.length === 0) return { code: null, json: null };
  const { graph, matching } = unwrap(
    buildGarden({
      names: design.sprouts.map((sprout) => sprout.label),
      vines: design.vines,
      lanterns: design.lanterns,
    }),
  );
  return {
    code: encodeGarden(graph, matching),
    json: JSON.stringify(toLevelFile(design), null, INDENT),
  };
}
