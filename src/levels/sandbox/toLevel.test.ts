import { bruteForceMatching } from '@core/bruteforce/maximumMatching';
import { size } from '@core/matching/queries';
import type { ActionType } from '@core/rules/actions';
import { UNLOCKED_AT, actionsUnlockedBy } from '@core/rules/permissions';
import { unwrap } from '@core/shared/result';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { designArb } from '../../../tests/support/designs';
import { checkIntegrity } from '../integrity';
import { loadLevel } from '../loader';
import { EMPTY_DESIGN, type Design } from './design';
import { SANDBOX_LEVEL_ID, toLevelFile, toPlayable } from './toLevel';

/** Every action of the game. */
const ALL = Object.keys(UNLOCKED_AT) as ActionType[];

/** A path A–B–C–D with B=C lit: one chain, A–B=C–D, lights a second lantern. */
const PATH: Design = {
  sprouts: [
    { label: 'A', x: 60, y: 100 },
    { label: 'B', x: 120, y: 100 },
    { label: 'C', x: 180, y: 100 },
    { label: 'D', x: 240, y: 100 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
  ],
  lanterns: [['B', 'C']],
};

describe('a design as a level file', () => {
  it('is a draft of chapter 9 with its garden, a hidden goal and the victory "maximum"', () => {
    const file = toLevelFile(PATH);
    expect(SANDBOX_LEVEL_ID).toBe('9.1');
    expect(file).toMatchObject({
      id: '9.1',
      draft: true,
      sprouts: PATH.sprouts,
      vines: PATH.vines,
      lanterns: PATH.lanterns,
      goal: { visible: false },
      victory: { type: 'maximum' },
      flow: [{ step: 'play' }],
    });
  });

  it('carries the chains Edmonds finds from its lanterns, then "Terminé"', () => {
    expect(toLevelFile(PATH).solution).toEqual([
      { type: 'chain', path: ['A', 'B', 'C', 'D'] },
      { type: 'declareDone' },
    ]);
  });

  it('is only "Terminé" when the garden is already as lit as it can be', () => {
    const lit: Design = {
      ...PATH,
      lanterns: [
        ['A', 'B'],
        ['C', 'D'],
      ],
    };
    expect(toLevelFile(lit).solution).toEqual([{ type: 'declareDone' }]);
    expect(checkIntegrity(unwrap(loadLevel(toLevelFile(lit))))).toEqual([]);
  });

  it('keeps bees and flowers', () => {
    const sides: Design = {
      ...PATH,
      sprouts: PATH.sprouts.map((sprout, i) => ({
        ...sprout,
        kind: i % 2 === 0 ? 'bee' : 'flower',
      })),
    };
    const level = unwrap(loadLevel(toLevelFile(sides)));
    expect(level.data.sprouts.map((sprout) => sprout.kind)).toEqual([
      'bee',
      'flower',
      'bee',
      'flower',
    ]);
    expect(checkIntegrity(level)).toEqual([]);
  });

  it('is no level when two sprouts share a name, and carries no chain then', () => {
    const twins: Design = {
      ...PATH,
      sprouts: PATH.sprouts.map((sprout) => ({ ...sprout, label: 'A' })),
    };
    expect(toLevelFile(twins).solution).toEqual([{ type: 'declareDone' }]);
    expect(toPlayable(twins, ALL).ok).toBe(false);
    expect(toPlayable(twins, actionsUnlockedBy('1.7')).ok).toBe(false);
  });

  it('is no level while the design is empty', () => {
    expect(loadLevel(toLevelFile(EMPTY_DESIGN)).ok).toBe(false);
    expect(toPlayable(EMPTY_DESIGN, ALL).ok).toBe(false);
  });

  it('property: a design made in the editor loads and passes every check of the catalog', () => {
    fc.assert(
      fc.property(designArb(), (design) => {
        const level = loadLevel(toLevelFile(design));
        expect(level.ok).toBe(true);
        if (!level.ok) return;
        // No exemption: the editor never lets a name be hidden.
        expect(checkIntegrity(level.value)).toEqual([]);
      }),
      { numRuns: 120 },
    );
  });
});

describe('a design to play', () => {
  it('allows the actions given, and hides the goal behind "Terminé"', () => {
    const allowed = actionsUnlockedBy('4.5');
    const level = unwrap(toPlayable(PATH, allowed));
    // No fog to inspect, and no light that searches by itself: that is a level's, not a design's.
    const fogless = allowed.filter((action) => action !== 'inspect' && action !== 'stepLight');
    expect([...level.start.allowed].sort()).toEqual([...fogless].sort());
    expect(level.data.goal).toEqual({ visible: false });
    expect(level.data.victory).toEqual({ type: 'maximum' });
  });

  it('closes nothing for the day: a move not at hand is one not learnt yet, and any chain goes', () => {
    const level = unwrap(toPlayable(PATH, actionsUnlockedBy('3.1')));
    expect(level.start.closed).toEqual(new Set());
    expect(level.start.chains).toEqual({ rule: 'any' });
  });

  it('never allows inspecting: a garden of the free mode has no fog to lift', () => {
    for (const allowed of [ALL, actionsUnlockedBy('3.1'), actionsUnlockedBy('1.7')]) {
      const level = unwrap(toPlayable(PATH, allowed));
      expect(level.data.fog).toBe(false);
      expect(level.start.allowed.has('inspect')).toBe(false);
    }
  });

  it('shows the optimum as its goal before "Terminé" is learnt', () => {
    const allowed = actionsUnlockedBy('1.7');
    const level = unwrap(toPlayable(PATH, allowed));
    expect(level.start.allowed.has('declareDone')).toBe(false);
    expect(level.data.goal).toEqual({ visible: true, value: 2 });
    expect(level.data.victory).toEqual({ type: 'matchingSize', value: 2 });
  });

  it('property: up to 10 sprouts, its optimum is the one trying every set of lanterns finds', () => {
    fc.assert(
      fc.property(designArb({ maxSprouts: 10 }), (design) => {
        const level = unwrap(toPlayable(design, actionsUnlockedBy('1.7')));
        const brute = bruteForceMatching(level.graph);
        expect(brute.status).toBe('complete');
        if (brute.status !== 'complete') return;
        expect(level.data.goal).toEqual({ visible: true, value: size(brute.matching) });
      }),
      { numRuns: 120 },
    );
  });
});
