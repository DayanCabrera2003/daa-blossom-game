import { checkBlossom } from '@core/blossom/isBlossom';
import type { ActionType } from '@core/rules/actions';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from './build';

/** Something wrong with the chain rule a level writes (plan 10, section 2). */
export type ChainProblem =
  /**
   * A level where only the chain seen moves lanterns leaves open a move that changes them without
   * the light: splitting, passing the lantern or rotating the stem would open chains the search
   * finds without folding (plan 10, X1).
   */
  | { readonly code: 'seenRuleOpen'; readonly action: ActionType }
  /** The closed flower is no flower of the starting garden, or its base is not written first. */
  | { readonly code: 'badChainFlower'; readonly petals: readonly string[] };

/** The moves that change the lanterns without the light, closed wherever the rule is `seen`. */
const MOVES_WITHOUT_LIGHT: readonly ActionType[] = ['split', 'passLantern', 'rotateStem'];

/**
 * The checks of a level's chain rule: with `seen`, every move that changes the lanterns without the
 * light is closed in its `forbid` (undoing stays free: it is the history, not a move); with
 * `fromBase`, the closed flower is a flower of the starting lanterns (`checkBlossom`) written base
 * first, so the rule names the right base. Any chain has nothing to check.
 */
export function checkChainRule(level: Level): ChainProblem[] {
  const { start, data } = level;
  const { chains } = start;
  switch (chains.rule) {
    case 'any':
      return [];
    case 'seen':
      return MOVES_WITHOUT_LIGHT.filter((action) => start.allowed.has(action)).map((action) => ({
        code: 'seenRuleOpen',
        action,
      }));
    case 'fromBase': {
      const petals = data.chains.rule === 'fromBase' ? data.chains.flower : [];
      const checked = checkBlossom(start.graph, start.matching, chains.petals);
      const sound = checked.ok && itemAt(checked.value, 0) === chains.base;
      return sound ? [] : [{ code: 'badChainFlower', petals }];
    }
  }
}
