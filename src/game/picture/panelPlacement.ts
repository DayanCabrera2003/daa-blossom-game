import { invariant } from '@core/shared/invariant';
import type { Rect } from './boxDistance';
import { totalCoverage } from './coverage';
import type { Avoidance } from './panelAvoidance';

/**
 * Where a panel opens among the spots it may take (the post-release fix of plan 09): the one that
 * hides least of what the step on screen points at (none, whenever some spot allows it), then least
 * of what the panel keeps in sight before the rest, if anything, then least of the whole garden,
 * and among equals the earliest offered, so a panel that hid nothing where it always opened still
 * opens there. Pure.
 */

/** Coverages closer than this, in square pixels, count as the same: a hair is no reason to move. */
const SAME = 0.5;

/**
 * How much a spot hides of what is pointed at, of what is kept in sight before the rest (the
 * sprouts, for the dialogue box), and of the whole garden, in that order of weight.
 */
type Cost = readonly [referred: number, kept: number, shapes: number];

/** Whether `cost` is clearly better than `best`: less of the first measure that differs. */
function better(cost: Cost, best: Cost): boolean {
  for (const [i, value] of cost.entries()) {
    const other = best[i] ?? 0;
    if (value < other - SAME) return true;
    if (value > other + SAME) return false;
  }
  return false;
}

/** The spot among `spots` (where the panel always opened first) that hides least of `avoid`. */
export function choosePanel(spots: readonly Rect[], avoid: Avoidance): Rect {
  const [first] = spots;
  invariant(first !== undefined, 'a panel is offered at least one spot');
  const cost = (spot: Rect): Cost => [
    totalCoverage(spot, avoid.referred),
    totalCoverage(spot, avoid.kept ?? []),
    totalCoverage(spot, avoid.shapes),
  ];
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
