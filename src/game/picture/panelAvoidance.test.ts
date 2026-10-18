import { describe, expect, it } from 'vitest';
import { invariant } from '@core/shared/invariant';
import { catalog } from '@levels/catalog';
import { questionMoments } from '../../../tests/support/panelMoments';
import { openController } from '../systems/levelController';
import { NOTHING_TO_AVOID, panelAvoidance } from './panelAvoidance';

const levels = catalog();

describe('what a panel opening now keeps clear of', () => {
  it('in a garden with nothing pointed at: every piece shown, none referred', () => {
    const level = levels.find((candidate) => candidate.data.id === '1.1');
    invariant(level !== undefined, 'level 1.1 exists');
    const { controller } = openController(level, 0);
    const avoid = panelAvoidance(controller);
    expect(avoid.shapes.length).toBeGreaterThanOrEqual(2 * level.data.sprouts.length);
    expect(avoid.referred).toEqual([]);
  });

  it('at the question of 2.2 about the thread through 1: that thread', () => {
    const level = levels.find((candidate) => candidate.data.id === '2.2');
    invariant(level !== undefined, 'level 2.2 exists');
    const moment = questionMoments(level).find((candidate) => candidate.step === 6);
    invariant(moment !== undefined, 'level 2.2 asks at step 6');
    const avoid = panelAvoidance(moment.controller);
    expect(avoid.referred.length).toBeGreaterThan(0);
    for (const shape of avoid.referred) expect(avoid.shapes).toContainEqual(shape);
  });

  it('a screen with no garden keeps clear of nothing', () => {
    expect(NOTHING_TO_AVOID).toEqual({ shapes: [], referred: [] });
  });
});
