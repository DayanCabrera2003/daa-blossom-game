import type { Action } from '@core/rules/actions';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { hitTest } from '../input/HitTest';
import { extendLift, releaseLift, startsLift, type LiftFills } from '../input/liftDrag';
import type { PointerState } from '../input/pointer';
import { NO_SELECTION } from '../input/selection';
import type { Point } from '../input/target';
import type { LayerView } from '../picture/layers';
import { current, type History } from './history';
import { foundChain, type FoundChain } from './liftGaps';

/**
 * The gesture of lifting as the pointer of the level screen meets it (plan 10, phase 2): which
 * press starts a drag into a gap of the found chain, where a move takes it, and what letting go
 * does. Pure; the level controller asks here first and, when the answer is null, handles the
 * pointer as always, so outside the gardens with the gesture nothing changes.
 */

/** What the gesture reads of the level screen: the pointer, the day, the fills, the layer shown. */
export interface LiftScreen {
  readonly pointer: PointerState;
  readonly history: History<GardenState>;
  readonly lift: LiftFills;
  readonly view: LayerView;
}

/** A move of a drag into a gap: the pointer after it, and the refusal of a wrong side, if any. */
export interface LiftMove {
  readonly pointer: PointerState;
  readonly refusal: { readonly reason: RejectReason; readonly action: Action } | null;
}

/**
 * What letting go of a drag into a gap does: the pointer let go and the fills kept; and the whole
 * chain to apply (`apply`), or a wrong fill refused (`refuse`), or nothing more (`none`).
 */
export type LiftLetGo = { readonly pointer: PointerState; readonly lift: LiftFills } & (
  | { readonly kind: 'none' }
  | { readonly kind: 'apply'; readonly action: Action }
  | { readonly kind: 'refuse'; readonly reason: RejectReason; readonly action: Action }
);

/** The chain the light found at the moment shown, with its gaps; null where there is none. */
const foundNow = (screen: LiftScreen): FoundChain | null =>
  foundChain(screen.history.states, screen.history.cursor);

/** The garden shown. */
const shown = (screen: LiftScreen): GardenState => current(screen.history);

/**
 * A press of the lanterns tool on a lit end of an open gap of the found chain: the pointer that
 * starts a drag into that gap; null when the press is not one.
 */
export function pressLift(screen: LiftScreen, point: Point): PointerState | null {
  const { pointer, view } = screen;
  const state = shown(screen);
  const target = hitTest(state, view.positions, point, view);
  if (pointer.tool !== 'lanterns' || target.kind !== 'sprout') return null;
  return startsLift(foundNow(screen), state, target.vertex)
    ? { ...pointer, chain: [target.vertex] }
    : null;
}

/**
 * A move while dragging into a gap (a drag that started on a lit end of one): it follows the
 * petals of the gap's flower, and a wrong side is refused at once with the sprouts it tried. Null
 * when the drag is no lift.
 */
export function moveLift(screen: LiftScreen, point: Point): LiftMove | null {
  const { pointer, view } = screen;
  const state = shown(screen);
  const found = foundNow(screen);
  const start = pointer.chain?.[0];
  if (found === null || pointer.chain === null || start === undefined) return null;
  if (!startsLift(found, state, start)) return null;
  const target = hitTest(state, view.positions, point, view);
  if (target.kind !== 'sprout') return { pointer, refusal: null };
  const step = extendLift(found, state, pointer.chain, target.vertex);
  const moved = { ...pointer, chain: step.path };
  return {
    pointer: moved,
    refusal:
      step.rejection === null
        ? null
        : { reason: step.rejection, action: { type: 'chain', path: step.tried } },
  };
}

/**
 * Letting go of a drag where the found chain has gaps: a fill is kept, the last one gives the whole
 * chain to apply, a wrong one is refused; a drag into a gap that fills nothing is let go. Null when
 * it is no lift, and the drag is a chain as always.
 */
export function letGoLift(screen: LiftScreen): LiftLetGo | null {
  const { pointer, lift } = screen;
  const chain = pointer.chain;
  if (chain === null || chain.length < 2) return null;
  const state = shown(screen);
  const found = foundNow(screen);
  const released = releaseLift(found, state, lift, chain);
  const letGo = { ...pointer, selection: NO_SELECTION, chain: null };
  switch (released.kind) {
    case 'notLift': {
      const start = chain[0];
      const lifting = start !== undefined && startsLift(found, state, start);
      return lifting ? { pointer: letGo, lift, kind: 'none' } : null;
    }
    case 'filled':
      return { pointer: letGo, lift: released.fills, kind: 'none' };
    case 'composed':
      return { pointer: letGo, lift, kind: 'apply', action: released.action };
    case 'refused':
      return {
        pointer: letGo,
        lift,
        kind: 'refuse',
        reason: released.reason,
        action: released.action,
      };
  }
}
