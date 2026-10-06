import type { TraceEvent } from '../trace/events';
import type { RejectReason } from './reasons';
import type { GardenState } from './state';

/**
 * The answer of the rules to an action: the new garden and what happened (for the animation
 * queue), or a stable reason why nothing happened. The given state is never modified.
 */
export type ActionOutcome =
  | { readonly ok: true; readonly state: GardenState; readonly events: readonly TraceEvent[] }
  | { readonly ok: false; readonly reason: RejectReason };

/** The action is applied. */
export const accept = (state: GardenState, events: readonly TraceEvent[] = []): ActionOutcome => ({
  ok: true,
  state,
  events,
});

/** The action is refused, and why. */
export const reject = (reason: RejectReason): ActionOutcome => ({ ok: false, reason });
