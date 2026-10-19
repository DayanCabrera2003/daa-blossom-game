import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { invariant } from '@core/shared/invariant';
import { describe, expect, it } from 'vitest';
import { handle, openController, type Controller } from './levelController';
import { act } from './levelSession';

/** A level of the catalog by its id. */
function levelOf(id: string): Level {
  const found = catalog().find((level) => level.data.id === id);
  invariant(found !== undefined, `the catalog has level ${id}`);
  return found;
}

/** The controller of 3.7 with scarecrows on 2 and 4 only: the star is left unguarded. */
function halfGuarded(): Controller {
  const level = levelOf('3.7');
  const { controller } = openController(level, 0);
  let { session } = controller;
  for (const vertex of [1, 3])
    session = act(session, { type: 'placeScarecrow', vertex }, 0).session;
  return { ...controller, session };
}

describe('the level controller answers a claim that does not win', () => {
  it('the move is shown, then why it falls short; a vine nobody guards glows', () => {
    const step = handle(halfGuarded(), { kind: 'done' }, 0);
    const [H, L1] = [5, 6];
    expect(step.effects).toEqual([
      { kind: 'animate', action: { type: 'declareDone' }, events: [{ type: 'declareDone' }] },
      { kind: 'claimRefused', verdict: { code: 'unguarded', vine: [H, L1] } },
    ]);
    expect(step.controller.vineGlow).toEqual([H, L1]);
  });

  it('a verdict with no vine to show puts out what glowed, like any move', () => {
    const level = levelOf('1.8');
    const { controller } = openController(level, 0);
    const glowing: Controller = { ...controller, vineGlow: [0, 1] };
    const step = handle(glowing, { kind: 'done' }, 0);
    expect(step.effects.at(-1)).toEqual({ kind: 'claimRefused', verdict: { code: 'chainLeft' } });
    expect(step.controller.vineGlow).toBeNull();
  });
});
