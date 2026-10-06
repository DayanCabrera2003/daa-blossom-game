import { isExposed } from '@core/matching/queries';
import { applyAction } from '@core/rules/applyAction';
import { invariant } from '@core/shared/invariant';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithTwoMatchingsArb } from '../../../tests/support/arbitraries';
import { POND, pondLevel } from '../../../tests/support/pondGarden';
import { degreeIn, lanternsOn, pieceOf, pondPieces, sharedPairs, winningPiece } from './pond';

const level = pondLevel();
invariant(level.mirror !== null, 'the pond garden has a reflection');
const yours = level.start.matching;
const mirror = level.mirror;

describe('the pond: your lanterns against the reflection', () => {
  it('the shared pair leaves the tangle: a thread and a loop remain of the three parts', () => {
    const pieces = pondPieces(yours, mirror);
    expect(pieces.map((piece) => piece.kind)).toEqual(['thread', 'loop']);
    expect(pieceOf(pieces, POND['e'] as number)).toBeNull();
    expect(pieceOf(pieces, POND['f'] as number)).toBeNull();
    expect(sharedPairs(yours, mirror)).toEqual([[POND['e'], POND['f']]]);
  });

  it('the thread 1…6 holds 2 of yours and 3 of the reflection; the loop a…d, 2 and 2', () => {
    const pieces = pondPieces(yours, mirror);
    const thread = pieceOf(pieces, POND['4'] as number);
    const loop = pieceOf(pieces, POND['c'] as number);
    invariant(thread !== null && loop !== null, 'both pieces are in the tangle');
    expect(thread.sprouts).toEqual([0, 1, 2, 3, 4, 5]);
    expect([lanternsOn(thread, 'yours'), lanternsOn(thread, 'mirror')]).toEqual([2, 3]);
    expect([lanternsOn(loop, 'yours'), lanternsOn(loop, 'mirror')]).toEqual([2, 2]);
    expect(thread.strands.map((strand) => strand.side)).toEqual([
      'mirror',
      'yours',
      'mirror',
      'yours',
      'mirror',
    ]);
    expect(loop.strands).toHaveLength(4);
  });

  it('a sprout has as many strands as vines of it in the tangle: 0, 1 or 2', () => {
    const degree = (name: string) => degreeIn(yours, mirror, POND[name] as number);
    expect(['1', '3', '6', 'a', 'e'].map(degree)).toEqual([1, 2, 1, 2, 0]);
  });

  it('no sprout ever has more than 2 strands, whatever the garden and the two sets of lanterns', () => {
    fc.assert(
      fc.property(graphWithTwoMatchingsArb(), ([graph, one, other]) => {
        for (let v = 0; v < graph.n; v++) {
          const degree = degreeIn(one, other, v);
          expect(degree).toBeGreaterThanOrEqual(0);
          expect(degree).toBeLessThanOrEqual(2);
        }
      }),
    );
  });

  it('the winning thread starts and ends dark in your garden, and the rules take it as a chain', () => {
    const winner = winningPiece(yours, mirror);
    invariant(winner !== null, 'the reflection holds one more lantern');
    expect(winner.kind).toBe('thread');
    const first = winner.sprouts[0] as number;
    const last = winner.sprouts[winner.sprouts.length - 1] as number;
    expect([first, last]).toEqual([POND['1'], POND['6']]);
    expect(isExposed(yours, first) && isExposed(yours, last)).toBe(true);
    const outcome = applyAction(level.start, { type: 'chain', path: winner.sprouts });
    expect(outcome.ok).toBe(true);
  });

  it('no piece wins once you tie: the reflection is no better than your garden', () => {
    expect(winningPiece(mirror, mirror)).toBeNull();
    expect(pondPieces(mirror, mirror)).toEqual([]);
  });
});
