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
 * sleep in the dark at least, g − k, against how many do. The "at least" is read off the core's
 * bound: with at most `tutteBergeBound` lanterns, at least n − 2·bound sprouts stay in the dark,
 * which is g − k, and never fewer than none.
 *
 * It is there from 7.2 on, also with no stone lifted (U = ∅: the loop of five is one odd group).
 * In the fog (7.5) the groups would show vines not inspected yet, so the count is only worked out
 * once the certificate is presented with "Terminé"; until then the bar says so. Null before 7.2.
 */
export function councilCount(level: Level, state: GardenState): TextRef | null {
  if (!isUiUnlocked('council', level.data.id)) return null;
  if (level.data.fog && !state.declaredDone) return { key: 'hud.councilHidden', params: {} };
  const { graph, stones, matching } = state;
  const atLeast = graph.n - 2 * tutteBergeBound(graph, stones);
  return {
    key: 'hud.council',
    params: {
      groups: oddComponents(graph, stones).length,
      stones: stones.length,
      atLeast: Math.max(0, atLeast),
      dark: graph.n - 2 * size(matching),
    },
  };
}
