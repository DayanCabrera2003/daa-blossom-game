import { invariant } from '../shared/invariant';

/**
 * The children visited going around a flower of `length` children from child `i` to the base
 * (child 0), as indices. Lit pairs are (1,2), (3,4), …: an odd child shares its lantern with the
 * next one and an even child with the previous one, so the walk heads that way. Starting on a
 * lantern and alternating, it reaches the base on a dark vine (both vines at the base are dark):
 * an even alternating path, the side that works when unfolding (levels 4.5, 4.6; Códex C8).
 */
export function walkToBase(length: number, i: number): number[] {
  invariant(length % 2 === 1 && length >= 3, `a flower has an odd number ≥ 3 of children`);
  invariant(Number.isInteger(i) && i >= 0 && i < length, `child ${i} is not in the flower`);
  const walk: number[] = [];
  if (i % 2 === 1) {
    for (let child = i; child < length; child++) walk.push(child);
    walk.push(0);
  } else {
    for (let child = i; child >= 0; child--) walk.push(child);
  }
  return walk;
}
