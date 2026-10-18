import type { Design } from '@levels/sandbox/design';
import { MAX_SPROUTS, MAX_VINES } from '@levels/sandbox/limits';
import type { DesignTool } from '../input/designIntent';
import type { TextRef } from './hud';

/**
 * The two lines at the top of the free mode's editor (plan 08, phase 11), where a level's HUD
 * shows its goal: on the first, the free mode's title at the left and, at the right, how many
 * sprouts and vines the design has out of the most it may hold, so a limit is seen coming before
 * an edit is refused; on the second, what the tool in hand asks of the hand (or, while the generate
 * menu is open, how it works), so a player who has never seen an editor always reads what to do.
 */

/** Where the header's texts go: its lines, its margin, and the least room between two texts. */
export const DESIGN_HEADER = { titleY: 1, promptY: 12, margin: 4, gap: 8 } as const;

/** What the header says now. */
export interface DesignHeaderText {
  readonly count: TextRef;
  readonly prompt: TextRef;
}

/** The header of `design` with `tool` in hand, or with the generate menu open. */
export function designHeader(
  design: Design,
  tool: DesignTool,
  generating: boolean,
): DesignHeaderText {
  return {
    count: {
      key: 'sandbox.count',
      params: {
        sprouts: design.sprouts.length,
        maxSprouts: MAX_SPROUTS,
        vines: design.vines.length,
        maxVines: MAX_VINES,
      },
    },
    prompt: { key: generating ? 'sandbox.prompt.generate' : `sandbox.prompt.${tool}`, params: {} },
  };
}
