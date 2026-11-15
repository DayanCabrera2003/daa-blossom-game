import { itemAt } from '@core/shared/itemAt';
import type { Level } from './build';
import { gardenBefore } from './playStart';

/**
 * Something wrong with what a hint calls suns (plan 11, phase 3). In a level that repairs a broken
 * recipe (6.3), the hints come while the player fixes it, over the garden Bruto's run left: the
 * sprouts they light up are where the missing card should have acted, two suns of one tree.
 */
export type HintSunProblem =
  /** Some sprouts the hint lights up are not suns there: moons, or unmarked. */
  | { readonly code: 'hintNotSun'; readonly line: string; readonly sprouts: readonly string[] }
  /** The sprouts it lights up are suns, but of different trees: their vine is a chain. */
  | { readonly code: 'hintSunsApart'; readonly line: string };

/**
 * `hintNotSun` and `hintSunsApart`: in a level whose script has a recipe step that arrives without
 * some cards, every hint lights up only suns of one tree in the garden that step starts from (the
 * marks the broken run kept with its "Terminé"). Other levels are not checked: in a play step the
 * marks are the player's, and a hint may be asked before any is made.
 */
export function checkHintSuns(level: Level): HintSunProblem[] {
  const repair = level.flow.findIndex((step) => step.step === 'recipe' && step.missing.length > 0);
  if (repair < 0) return [];
  const { layer, search } = gardenBefore(level, repair);
  return level.hints.flatMap(({ line, highlight }): HintSunProblem[] => {
    if (highlight.length === 0) return [];
    const nodes = highlight.map((sprout) => itemAt(layer.nodeOf, sprout));
    const notSuns = highlight.filter((_, i) => search?.label[itemAt(nodes, i)] !== 'outer');
    if (notSuns.length > 0) {
      return [
        { code: 'hintNotSun', line, sprouts: notSuns.map((v) => itemAt(level.labels.names, v)) },
      ];
    }
    const trees = new Set(nodes.map((node) => search?.root[node]));
    return trees.size > 1 ? [{ code: 'hintSunsApart', line }] : [];
  });
}
