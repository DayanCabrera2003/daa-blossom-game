import type { GardenState } from '@core/rules/state';
import type { ToolId } from './tools';

/**
 * The hand of the gardens where the light searches by itself (GDD §5.1, «La barra de
 * herramientas»; 4.4–4.8, 4.12, chapter 5): there the player folds at the clash, opens a flower
 * and drags the chain or the stretch of a flower whatever the tool in hand, so nobody has to guess
 * which tool a touch needs. The layers are the exception: they only look.
 */

/** Whether the light searches by itself in the garden: only those gardens allow advancing it. */
export const lightSearches = (state: GardenState): boolean => state.allowed.has('stepLight');

/**
 * Whether a press with `tool` may start dragging a chain: the lanterns, or any tool but the layers
 * where the light searches by itself.
 */
export const dragsChains = (state: GardenState, tool: ToolId): boolean =>
  tool === 'lanterns' || (tool !== 'layers' && lightSearches(state));
