import type { BlossomError } from '@core/blossom/isBlossom';
import { checkBlossom } from '@core/blossom/isBlossom';
import { nameOf } from '@core/graph/labels';
import { isExposed } from '@core/matching/queries';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from './build';
import { SIDE_BY_SIDE } from './fields';

/** Something wrong with the flower a level declares (4.11). */
export type FlowerProblem =
  /** The petals are no flower of the starting garden. */
  | { readonly code: 'notAFlower'; readonly error: BlossomError }
  /** The flower's base holds a lantern: the challenge needs it in the dark (the stem turned). */
  | { readonly code: 'flowerBaseLit'; readonly base: string }
  /** The petals do not start at the base. */
  | { readonly code: 'flowerBaseNotFirst'; readonly base: string }
  /** A sprout sits where the folded garden is drawn, beside the open one. */
  | { readonly code: 'flowerOffSide'; readonly sprout: string };

/**
 * The checks of a level's flower: a flower of the starting lanterns (`checkBlossom`) written base
 * first, its base in the dark, as the flower lemma's hard direction assumes, and every sprout in
 * the left half of the garden, so the folded copy fits in the right half. A level without a flower
 * has nothing to check.
 */
export function checkFlower(level: Level): FlowerProblem[] {
  const { flower, start, labels, data } = level;
  if (flower === null) return [];
  const problems: FlowerProblem[] = [];
  const checked = checkBlossom(start.graph, start.matching, flower);
  if (!checked.ok) {
    problems.push({ code: 'notAFlower', error: checked.error });
  } else {
    const base = itemAt(checked.value, 0);
    const named = nameOf(labels, base);
    if (!isExposed(start.matching, base)) problems.push({ code: 'flowerBaseLit', base: named });
    else if (base !== itemAt(flower, 0)) problems.push({ code: 'flowerBaseNotFirst', base: named });
  }
  for (const sprout of data.sprouts) {
    if (sprout.x > SIDE_BY_SIDE.x1) problems.push({ code: 'flowerOffSide', sprout: sprout.label });
  }
  return problems;
}
