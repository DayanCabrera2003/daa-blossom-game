import { invariant } from '@core/shared/invariant';
import type { Rect } from './boxDistance';
import { totalCoverage } from './coverage';
import type { Avoidance } from './panelAvoidance';

/**
 * Where a panel opens among the spots it may take (the post-release fix of plan 09): the one that
 * hides least of what the step on screen points at (none, whenever some spot allows it), then least
 * of the rest of the garden, and among equals the earliest offered, so a panel that hid nothing
 * where it always opened still opens there. Pure.
 */

/** Coverages closer than this, in square pixels, count as the same: a hair is no reason to move. */
const SAME = 0.5;

/** How much of what is pointed at, and of the whole garden, a spot hides. */
interface Cost {
  readonly referred: number;
  readonly shapes: number;
}

/** Whether `cost` is clearly better than `best`: less of what is pointed at, then less overall. */
const better = (cost: Cost, best: Cost): boolean =>
  cost.referred < best.referred - SAME ||
  (cost.referred <= best.referred + SAME && cost.shapes < best.shapes - SAME);

/** The spot among `spots` (where the panel always opened first) that hides least of `avoid`. */
export function choosePanel(spots: readonly Rect[], avoid: Avoidance): Rect {
  const [first] = spots;
  invariant(first !== undefined, 'a panel is offered at least one spot');
  const cost = (spot: Rect): Cost => ({
    referred: totalCoverage(spot, avoid.referred),
    shapes: totalCoverage(spot, avoid.shapes),
  });
  let chosen = first;
  let best = cost(first);
  for (const spot of spots.slice(1)) {
    const candidate = cost(spot);
    if (better(candidate, best)) {
      chosen = spot;
      best = candidate;
    }
  }
  return chosen;
}
