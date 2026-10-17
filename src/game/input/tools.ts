import type { ActionType } from '@core/rules/actions';

/** A tool of the gardener's toolbar; each groups the actions one kind of touch performs. */
export type ToolId =
  'lanterns' | 'marks' | 'foldLoop' | 'inspect' | 'scarecrows' | 'stones' | 'layers';

/**
 * The actions behind each tool, in toolbar order (GDD §5.1). "Terminé", undo, redo and hints are
 * buttons of the HUD, not tools. The layers (5.2) make no move: touching a folded flower with them
 * only enters it, to see what it folds.
 */
export const TOOL_ACTIONS: Readonly<Record<ToolId, readonly ActionType[]>> = {
  lanterns: ['join', 'split', 'passLantern', 'chain', 'rotateStem'],
  marks: ['markRoot', 'markMoon', 'foldAt', 'unfold'],
  foldLoop: ['fold'],
  inspect: ['inspect'],
  scarecrows: ['placeScarecrow', 'removeScarecrow'],
  stones: ['liftStone', 'dropStone'],
  layers: [],
};

/**
 * The tools to show, in toolbar order: those with at least one action the level allows, and the
 * layers when the level has them open (`layers`, from 5.2), since they unlock by level, not by rule.
 */
export function availableTools(allowed: ReadonlySet<ActionType>, layers = false): ToolId[] {
  return (Object.keys(TOOL_ACTIONS) as ToolId[]).filter((tool) =>
    tool === 'layers' ? layers : TOOL_ACTIONS[tool].some((action) => allowed.has(action)),
  );
}
