import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import type { TraceEvent } from '@core/trace/events';

/** How long each kind of step lasts, in milliseconds (greybox values, tuned at the art phase). */
export const DURATIONS = {
  hop: 140,
  light: 180,
  putOut: 150,
  mark: 90,
  conflict: 500,
  fold: 420,
  unfold: 420,
  reveal: 220,
  chain: 500,
  clear: 200,
  place: 150,
} as const;

/** One thing the view animates; the garden it ends on is already known (logic is instant). */
export type AnimationStep =
  | {
      readonly kind: 'hop';
      readonly from: VertexId;
      readonly to: VertexId;
      readonly duration: number;
    }
  | {
      readonly kind: 'light' | 'putOut';
      readonly u: VertexId;
      readonly v: VertexId;
      readonly duration: number;
    }
  | {
      readonly kind: 'mark';
      readonly vertex: VertexId;
      readonly mark: 'sun' | 'moon';
      readonly duration: number;
    }
  | {
      readonly kind: 'conflict';
      readonly u: VertexId;
      readonly v: VertexId;
      readonly duration: number;
    }
  | { readonly kind: 'fold' | 'unfold'; readonly blossom: number; readonly duration: number }
  | { readonly kind: 'reveal'; readonly vertex: VertexId; readonly duration: number }
  | { readonly kind: 'chain'; readonly path: readonly VertexId[]; readonly duration: number }
  | { readonly kind: 'clear'; readonly duration: number }
  | {
      readonly kind: 'place';
      readonly vertex: VertexId;
      readonly object: 'scarecrow' | 'stone';
      readonly duration: number;
    };

/** The steps of one event; bookkeeping events (search start, scans, endings) show nothing. */
function stepsOf(event: TraceEvent): AnimationStep[] {
  switch (event.type) {
    case 'augment':
      return event.path.slice(1).map((to, i) => ({
        kind: 'hop',
        from: itemAt(event.path, i),
        to,
        duration: DURATIONS.hop,
      }));
    case 'light':
    case 'putOut':
      return [{ kind: event.type, u: event.u, v: event.v, duration: DURATIONS[event.type] }];
    case 'labelOuter':
    case 'labelInner':
      return [
        {
          kind: 'mark',
          vertex: event.vertex,
          mark: event.type === 'labelOuter' ? 'sun' : 'moon',
          duration: DURATIONS.mark,
        },
      ];
    case 'oddCycleFound':
      return [
        { kind: 'conflict', u: event.vine[0], v: event.vine[1], duration: DURATIONS.conflict },
      ];
    case 'contract':
      return [{ kind: 'fold', blossom: event.blossom, duration: DURATIONS.fold }];
    case 'expand':
      return [{ kind: 'unfold', blossom: event.blossom, duration: DURATIONS.unfold }];
    case 'inspect':
      return [{ kind: 'reveal', vertex: event.vertex, duration: DURATIONS.reveal }];
    case 'chainFound':
      return [{ kind: 'chain', path: event.path, duration: DURATIONS.chain }];
    case 'searchCleared':
      return [{ kind: 'clear', duration: DURATIONS.clear }];
    case 'scarecrow':
      return [
        { kind: 'place', vertex: event.vertex, object: 'scarecrow', duration: DURATIONS.place },
      ];
    case 'stone':
      return [{ kind: 'place', vertex: event.vertex, object: 'stone', duration: DURATIONS.place }];
    default:
      return [];
  }
}

/**
 * Turns the events of a move into animation steps, played one after another. The rules have
 * already produced the final garden; the view only catches up with it (the logic is instant).
 */
export function planAnimation(events: readonly TraceEvent[]): AnimationStep[] {
  return events.flatMap(stepsOf);
}

/** How long a plan lasts. */
export const totalDuration = (steps: readonly AnimationStep[]): number =>
  steps.reduce((sum, step) => sum + step.duration, 0);

/**
 * The step playing `elapsed` ms after the start, and how far into it (0 to 1), or null once the
 * plan is over. A new move by the player skips straight to the end: the view just stops asking.
 */
export function stepAt(
  steps: readonly AnimationStep[],
  elapsed: number,
): { index: number; progress: number } | null {
  let start = 0;
  for (const [index, step] of steps.entries()) {
    if (elapsed < start + step.duration)
      return { index, progress: (elapsed - start) / step.duration };
    start += step.duration;
  }
  return null;
}
