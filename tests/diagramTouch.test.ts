import { describe, expect, it } from 'vitest';
import { resolveTap } from '@game/input/intent';
import { NO_SELECTION, type Selection } from '@game/input/selection';
import type { Target } from '@game/input/target';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { catalog } from '@levels/catalog';
import { touchDiagram, type DiagramTarget } from '@ui/model/diagramTouch';

/**
 * The small gardens of the Codex answer a touch exactly as the game's lanterns tool does (plan 07,
 * phase 4): the same move for the rules, and the same sprout held for the next touch. Both sides
 * are compared here, where both may be imported.
 */

/** The gardens compared: every level of chapters 0 and 1 as it starts, and after its first move. */
function gardens(): GardenState[] {
  return catalog()
    .filter((level) => /^[01]\./.test(level.data.id))
    .flatMap((level) => {
      const first = level.solution[0];
      const after = first === undefined ? null : applyAction(level.start, first);
      return after?.ok === true ? [level.start, after.state] : [level.start];
    });
}

describe('a touch on a small garden of the Codex', () => {
  it('asks the rules for the very move the game would, and holds the same sprout', () => {
    const moves = new Set(['join', 'split', 'passLantern'] as const);
    let compared = 0;
    for (const state of gardens()) {
      const sprouts = Array.from({ length: state.graph.n }, (_, vertex) => vertex);
      const targets: DiagramTarget[] = [
        ...sprouts.map((vertex) => ({ kind: 'sprout' as const, vertex })),
        ...state.graph.edges.map(([u, v]) => ({ kind: 'vine' as const, u, v })),
      ];
      const held: (number | null)[] = [null, ...sprouts];
      for (const vertex of held) {
        const selection: Selection = vertex === null ? NO_SELECTION : { kind: 'sprout', vertex };
        for (const target of targets) {
          const game = resolveTap(state, 'lanterns', selection, target as Target);
          const page = touchDiagram(state, moves, vertex === null ? [] : [vertex], target);
          expect(page.action).toEqual(game.action);
          const gameHeld = game.selection.kind === 'sprout' ? [game.selection.vertex] : [];
          expect(page.touched).toEqual(gameHeld);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(500);
  });
});
