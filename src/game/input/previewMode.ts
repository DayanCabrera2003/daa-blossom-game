import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { chainGain } from './dragChain';

/**
 * How much the chain being dragged tells (GDD §5.1, Cadena): `gain` says what letting go would gain
 * (+1, 0 in grey, or not legal), as in the Meadow and the Pond; `legality` only says whether the
 * chain is legal, so from the Greenhouse on the player has to count the lanterns, and sees the gain
 * when the chain is applied.
 */
export type PreviewMode = 'gain' | 'legality';

/** What the chain being dragged says now: its gain, or only whether it is legal. */
export type ChainPreview = 'gain1' | 'gain0' | 'legal' | 'illegal';

/** The last chapter whose dragged chains still tell their gain (the Pond). */
const LAST_GAIN_CHAPTER = 2;

/**
 * How much the dragged chains of the level `levelId` of the catalog tell: their gain in chapters
 * 0–2, only whether they are legal from chapter 3 on (its secret flowers included, as they belong to
 * their chapter). The free mode keeps the gain: it is a tool, not a level, so its screen asks for
 * `gain` itself.
 */
export function previewModeOf(levelId: string): PreviewMode {
  const chapter = Number(levelId.split('.')[0]);
  return chapter <= LAST_GAIN_CHAPTER ? 'gain' : 'legality';
}

/** What the chain `path` dragged in `state` says in the mode `mode`. */
export function chainPreview(
  state: GardenState,
  path: readonly VertexId[],
  mode: PreviewMode,
): ChainPreview {
  const gain = chainGain(state, path);
  if (gain === null) return 'illegal';
  if (mode === 'legality') return 'legal';
  return gain === 1 ? 'gain1' : 'gain0';
}
