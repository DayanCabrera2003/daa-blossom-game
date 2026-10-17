import { checkAugmentingPath } from '@core/matching/paths';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bloomLevel } from '../../../tests/support/fixtureLevels';
import { plantedFlowerArb } from '../../../tests/support/plantedFlower';
import {
  FLOWER_MISSES_BEFORE_SPARED,
  drawFlowerChain,
  mentorChain,
  startFlowerChallenge,
  type FlowerChallenge,
} from './flowerChallenge';

// The bloom garden: b c d f g e t h x = 0…8, the flower b–c=d–f=g–b with b in the dark.
const level = bloomLevel();
const garden = level.start;
const flower = [0, 1, 2, 3, 4];

/** Draws these chains, in order, on a fresh challenge. */
const drawing = (paths: number[][]): FlowerChallenge =>
  paths.reduce(
    (challenge, path) => drawFlowerChain(challenge, garden, flower, path).challenge,
    startFlowerChallenge(),
  );

describe('the flower challenge', () => {
  it('starts with no chain drawn, no miss and nothing shown', () => {
    expect(startFlowerChallenge()).toEqual({ chains: 0, misses: 0, drawn: [], shown: null });
  });

  it('a chain is cut at the flower: its outside end, the stretch to the first petal, folded', () => {
    const { challenge, attempt } = drawFlowerChain(
      startFlowerChallenge(),
      garden,
      flower,
      [6, 8, 7, 2, 1, 5],
    );
    if (attempt.kind !== 'cut') throw new Error('a chain is cut');
    expect(attempt.argument).toEqual({
      ends: { outside: 6, other: 5, base: 0 },
      stretch: [6, 8, 7, 2],
      folded: [2, 4, 3, 0],
    });
    expect(attempt.cut.petal).toBe(2);
    expect(attempt.path).toEqual([6, 8, 7, 2, 1, 5]);
    expect(attempt.fresh).toBe(true);
    expect(challenge).toMatchObject({ chains: 1, misses: 0, shown: attempt });
  });

  it('a drawing that is no chain of the open garden is refused gently, and does not count', () => {
    const { challenge, attempt } = drawFlowerChain(
      startFlowerChallenge(),
      garden,
      flower,
      [6, 8, 7],
    );
    expect(attempt).toEqual({
      kind: 'notAChain',
      path: [6, 8, 7],
      error: { code: 'endpointNotExposed', vertex: 7 },
      spared: false,
    });
    expect(challenge).toMatchObject({ chains: 0, misses: 1, shown: attempt });
  });

  it('a chain drawn again, either way round, is shown cut again but counts once', () => {
    const once = drawing([[6, 8, 7, 2, 1, 5]]);
    const again = drawFlowerChain(once, garden, flower, [6, 8, 7, 2, 1, 5]);
    expect(again.attempt).toMatchObject({ kind: 'cut', fresh: false });
    expect(again.challenge.chains).toBe(1);
    expect(again.challenge.shown).toBe(again.attempt);
    const reversed = drawFlowerChain(again.challenge, garden, flower, [5, 1, 2, 7, 8, 6]);
    expect(reversed.attempt).toMatchObject({ kind: 'cut', fresh: false });
    expect(reversed.challenge.chains).toBe(1);
    const other = drawFlowerChain(reversed.challenge, garden, flower, [5, 6]);
    expect(other.attempt).toMatchObject({ kind: 'cut', fresh: true });
    expect(other.challenge.chains).toBe(2);
  });

  it('after enough drawings that are no chains, the challenge lets the player go', () => {
    const misses = Array.from({ length: FLOWER_MISSES_BEFORE_SPARED - 1 }, () => [6, 8]);
    const { attempt } = drawFlowerChain(drawing(misses), garden, flower, [6, 8]);
    expect(attempt).toMatchObject({ kind: 'notAChain', spared: true });
  });

  it('the mentor finds a chain of the open garden, and none when it holds the most', () => {
    const chain = mentorChain(garden.graph, garden.matching);
    expect(chain).not.toBeNull();
    expect(checkAugmentingPath(garden.graph, garden.matching, chain ?? []).ok).toBe(true);
    expect(drawFlowerChain(startFlowerChallenge(), garden, flower, chain ?? []).attempt.kind).toBe(
      'cut',
    );
    expect(mentorChain(garden.graph, { mate: [-1, 2, 1, 4, 3, 6, 5, 8, 7] })).toBeNull();
  });

  it('in any planted flower, the mentor chain is accepted and cut into a folded chain', () => {
    fc.assert(
      fc.property(plantedFlowerArb(), ({ graph, matching, flower: petals }) => {
        const chain = mentorChain(graph, matching);
        if (chain === null) return;
        const { attempt } = drawFlowerChain(
          startFlowerChallenge(),
          { graph, matching },
          petals,
          chain,
        );
        expect(attempt.kind).toBe('cut');
      }),
    );
  });
});
