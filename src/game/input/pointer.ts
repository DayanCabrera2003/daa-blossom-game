import type { VertexId } from '@core/graph/types';
import { isExposed } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { extendChain, finishChain } from './dragChain';
import { hitTest } from './HitTest';
import { resolveTap } from './intent';
import { NO_SELECTION, type Selection } from './selection';
import type { Point } from './target';
import type { ToolId } from './tools';

/**
 * Everything the input remembers between pointer events: the tool in hand, what is selected, and
 * the chain being dragged (null when not dragging). The level scene only forwards press, move and
 * release here, so what a player can do is exactly what the tests of this module can do.
 */
export interface PointerState {
  readonly tool: ToolId;
  readonly selection: Selection;
  readonly chain: readonly VertexId[] | null;
}

/** The pointer at the start of a level, holding `tool`. */
export const initialPointer = (tool: ToolId): PointerState => ({
  tool,
  selection: NO_SELECTION,
  chain: null,
});

/** Takes another tool; anything half done with the previous one is let go. */
export const chooseTool = (_pointer: PointerState, tool: ToolId): PointerState =>
  initialPointer(tool);

/**
 * A press. With the lanterns tool, pressing a sprout in the dark may start a chain (GDD 1.3);
 * whether it was a drag or a touch is only known on release. Pressing a lit sprout starts nothing:
 * it may be the second touch of passing a lantern.
 */
export function pressStart(
  pointer: PointerState,
  garden: GardenState,
  positions: readonly Point[],
  point: Point,
): PointerState {
  const target = hitTest(garden, positions, point);
  const startsChain =
    pointer.tool === 'lanterns' &&
    target.kind === 'sprout' &&
    isExposed(garden.matching, target.vertex);
  return { ...pointer, chain: startsChain ? [target.vertex] : null };
}

/** A move while pressed: a dragged chain follows the sprouts it passes over. */
export function pressMove(
  pointer: PointerState,
  garden: GardenState,
  positions: readonly Point[],
  point: Point,
): { pointer: PointerState; rejection: RejectReason | null } {
  if (pointer.chain === null) return { pointer, rejection: null };
  const target = hitTest(garden, positions, point);
  if (target.kind !== 'sprout') return { pointer, rejection: null };
  const step = extendChain(garden, pointer.chain, target.vertex);
  return { pointer: { ...pointer, chain: step.path }, rejection: step.rejection };
}

/**
 * A release: a chain through two sprouts or more is applied as dragged; anything else is a touch
 * on what lies under the release point.
 */
export function pressEnd(
  pointer: PointerState,
  garden: GardenState,
  positions: readonly Point[],
  point: Point,
): { pointer: PointerState; action: Action | null } {
  if (pointer.chain !== null && pointer.chain.length >= 2) {
    return {
      pointer: { ...pointer, selection: NO_SELECTION, chain: null },
      action: finishChain(garden, pointer.chain),
    };
  }
  const outcome = resolveTap(
    garden,
    pointer.tool,
    pointer.selection,
    hitTest(garden, positions, point),
  );
  return {
    pointer: { ...pointer, selection: outcome.selection, chain: null },
    action: outcome.action,
  };
}
