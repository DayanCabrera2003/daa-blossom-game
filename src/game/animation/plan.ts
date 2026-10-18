import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import type { TraceEvent } from '@core/trace/events';

/**
 * How long each kind of step lasts, in milliseconds, tuned to the key animations (GDD §4.1): a hop
 * crouches, flies and lands (`picture/squash.ts`); a fold shows its eight frames
 * (`picture/foldFrames.ts`); the conflict blinks three times between sun and moon
 * (`picture/conflictBlink.ts`); a stone falls, settles and parts the garden
 * (`picture/stoneSplit.ts`). A scarecrow set down or taken off is a `place`.
 */
export const DURATIONS = {
  hop: 260,
  light: 180,
  putOut: 150,
  mark: 120,
  conflict: 720,
  fold: 560,
  unfold: 560,
  reveal: 220,
  chain: 500,
  clear: 200,
  place: 150,
  stone: 640,
} as const;

/** How long a kind of step lasts. */
type Durations = { readonly [kind in keyof typeof DURATIONS]: number };

/**
 * The same, with less motion (plan 09, phase 6): a hop is a short fade from one sprout to the next
 * and a fold a short fade of the petals, with nothing flying; every other step keeps its time, so
 * what it tells (which lantern, which flower) is seen just as long.
 */
export const REDUCED_DURATIONS: Durations = {
  ...DURATIONS,
  hop: 120,
  fold: 240,
  unfold: 240,
};

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
      /** Set down (a stone lifted from the garden, a scarecrow placed), or taken off. */
      readonly placed: boolean;
      readonly duration: number;
    };

/**
 * The steps of one event, each lasting what `durations` says; bookkeeping events (search start,
 * scans, endings) show nothing.
 */
function stepsOf(event: TraceEvent, durations: Durations): AnimationStep[] {
  switch (event.type) {
    case 'augment':
      return event.path.slice(1).map((to, i) => ({
        kind: 'hop',
        from: itemAt(event.path, i),
        to,
        duration: durations.hop,
      }));
    case 'light':
    case 'putOut':
      return [{ kind: event.type, u: event.u, v: event.v, duration: durations[event.type] }];
    case 'labelOuter':
    case 'labelInner':
      return [
        {
          kind: 'mark',
          vertex: event.vertex,
          mark: event.type === 'labelOuter' ? 'sun' : 'moon',
          duration: durations.mark,
        },
      ];
    case 'oddCycleFound':
      return [
        { kind: 'conflict', u: event.vine[0], v: event.vine[1], duration: durations.conflict },
      ];
    case 'contract':
      return [{ kind: 'fold', blossom: event.blossom, duration: durations.fold }];
    case 'expand':
      return [{ kind: 'unfold', blossom: event.blossom, duration: durations.unfold }];
    case 'inspect':
      return [{ kind: 'reveal', vertex: event.vertex, duration: durations.reveal }];
    case 'chainFound':
      return [{ kind: 'chain', path: event.path, duration: durations.chain }];
    case 'searchCleared':
      return [{ kind: 'clear', duration: durations.clear }];
    case 'scarecrow':
      return [
        {
          kind: 'place',
          vertex: event.vertex,
          object: 'scarecrow',
          placed: event.placed,
          duration: durations.place,
        },
      ];
    case 'stone':
      return [
        {
          kind: 'place',
          vertex: event.vertex,
          object: 'stone',
          placed: event.lifted,
          duration: durations.stone,
        },
      ];
    default:
      return [];
  }
}

/**
 * Turns the events of a move into animation steps, played one after another. The rules have
 * already produced the final garden; the view only catches up with it (the logic is instant).
 * With `reduced` motion the steps are the same, in the same order, some of them shorter.
 */
export function planAnimation(events: readonly TraceEvent[], reduced = false): AnimationStep[] {
  const durations = reduced ? REDUCED_DURATIONS : DURATIONS;
  return events.flatMap((event) => stepsOf(event, durations));
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
