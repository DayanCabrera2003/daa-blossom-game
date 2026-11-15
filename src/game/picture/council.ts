import { oddComponents } from '@core/certificates/oddComponents';
import { tutteBergeBound } from '@core/certificates/tutteBerge';
import { size } from '@core/matching/queries';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { isUiUnlocked } from '@levels/uiUnlocks';
import type { TextRef } from './hud';

/**
 * The Council's count on the top bar (GDD 7.2, 7.3; plan 05, phase 6): with the stones lifted, how
 * many odd groups the garden splits into (g), how many stones (k), and so how many sprouts must
 * sleep in the dark at least, g − k, against how many do, and whether that adds up. The "at least"
 * is read off the core's bound: with at most `tutteBergeBound` lanterns, at least n − 2·bound
 * sprouts stay in the dark, which is g − k.
 *
 * Three texts, each one true as written: the subtraction with "it adds up" when as many sleep in
 * the dark as the subtraction says (the stones then prove the lanterns, the Council's own check);
 * the subtraction with "it proves nothing yet" otherwise; and, with more stones than odd groups,
 * no subtraction at all, since g − k would be below zero and the count says nothing.
 *
 * It is there from 7.2 on, also with no stone lifted (U = ∅: the loop of five is one odd group).
 * In the fog (7.5) the groups would show vines not inspected yet, so the count is only worked out
 * once the certificate is presented with "Terminé"; until then the bar says so. Null before 7.2:
 * before the level `interfaceAt` whose interface the screen shows (the level itself, but for a
 * garden of the free mode, which shows the interface the player has met).
 */
export function councilCount(
  level: Level,
  state: GardenState,
  interfaceAt: string = level.data.id,
): TextRef | null {
  if (!isUiUnlocked('council', interfaceAt)) return null;
  if (level.data.fog && !state.declaredDone) return { key: 'hud.councilHidden', params: {} };
  const { graph, stones, matching } = state;
  const groups = oddComponents(graph, stones).length;
  const dark = graph.n - 2 * size(matching);
  if (groups < stones.length) {
    return { key: 'hud.councilNoBound', params: { groups, stones: stones.length, dark } };
  }
  const atLeast = graph.n - 2 * tutteBergeBound(graph, stones);
  return {
    key: atLeast === dark ? 'hud.councilProves' : 'hud.council',
    params: { groups, stones: stones.length, atLeast, dark },
  };
}
