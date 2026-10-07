import type { ActionType } from '@core/rules/actions';

/** A tool of the gardener's toolbar; each groups the actions one kind of touch performs. */
export type ToolId = 'lanterns' | 'marks' | 'foldLoop' | 'inspect' | 'scarecrows' | 'stones';

/**
 * The actions behind each tool, in toolbar order (GDD §5.1). "Terminé", undo, redo and hints are
 * buttons of the HUD, not tools.
 */
export const TOOL_ACTIONS: Readonly<Record<ToolId, readonly ActionType[]>> = {
  lanterns: ['join', 'split', 'passLantern', 'chain', 'rotateStem'],
  marks: ['markRoot', 'markMoon', 'foldAt', 'unfold'],
  foldLoop: ['fold'],
  inspect: ['inspect'],
  scarecrows: ['placeScarecrow', 'removeScarecrow'],
  stones: ['liftStone', 'dropStone'],
};

/** The tools to show: those with at least one action the level allows, in toolbar order. */
export function availableTools(allowed: ReadonlySet<ActionType>): ToolId[] {
  return (Object.keys(TOOL_ACTIONS) as ToolId[]).filter((tool) =>
    TOOL_ACTIONS[tool].some((action) => allowed.has(action)),
  );
}
