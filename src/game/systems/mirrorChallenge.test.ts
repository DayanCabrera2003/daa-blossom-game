import { createGraph } from '@core/graph/createGraph';
import { isMaximum } from '@core/edmonds/fast/maximum';
import type { Graph } from '@core/graph/types';
import { createMatching } from '@core/matching/createMatching';
import { checkAugmentingPath } from '@core/matching/paths';
import { size } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import { unwrap } from '@core/shared/result';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb, graphWithTwoMatchingsArb } from '../../../tests/support/arbitraries';
import {
  MISSES_BEFORE_SPARED,
  betterReflection,
  checkMirror,
  drawReflection,
  drawVine,
  startChallenge,
  type MirrorChallenge,
} from './mirrorChallenge';

/** A path 0–1–2–3 with the middle vine lit: yours holds one lantern, two fit. */
const path = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]),
);
const yours = unwrap(createMatching(path, [[1, 2]]));

/** Draws these vines, in order, on a fresh challenge of `graph`. */
const drawing = (graph: Graph, vines: [number, number][]): MirrorChallenge =>
  vines.reduce(
    (challenge, [u, v]) => unwrap(drawVine(challenge, graph, u, v)),
    startChallenge(graph),
  );

describe('the mirror challenge', () => {
  it('starts with nothing drawn, nothing checked and nothing shown', () => {
    const challenge = startChallenge(path);
    expect(size(challenge.draft)).toBe(0);
    expect(challenge.misses).toBe(0);
    expect(challenge.shown).toBeNull();
  });

  it('a reflection with no more lanterns than yours does not beat you, and is no attempt', () => {
    const { challenge, check } = checkMirror(drawing(path, [[0, 1]]), yours);
    expect(check).toEqual({ kind: 'notBetter', drawn: 1, yours: 1, spared: false });
    expect(challenge.misses).toBe(1);
    expect(challenge.shown).toEqual(check);
  });

  it('a better reflection shows the winning thread, which is a chain of your garden', () => {
    const { challenge, check } = checkMirror(
      drawing(path, [
        [0, 1],
        [2, 3],
      ]),
      yours,
    );
    expect(check.kind).toBe('better');
    if (check.kind !== 'better') return;
    expect(check.fresh).toBe(true);
    expect(check.piece.sprouts).toEqual([0, 1, 2, 3]);
    expect(check.pieces).toHaveLength(1);
    expect(challenge.misses).toBe(0);
  });

  it('the same better reflection checked again shows its thread but counts no more', () => {
    const drawn = drawing(path, [
      [0, 1],
      [2, 3],
    ]);
    const first = checkMirror(drawn, yours);
    const again = checkMirror(first.challenge, yours).check;
    expect(again.kind === 'better' && again.fresh).toBe(false);
    // Taken apart and drawn again, it is still the same reflection.
    const redrawn = unwrap(drawVine(unwrap(drawVine(first.challenge, path, 0, 1)), path, 0, 1));
    const third = checkMirror(redrawn, yours).check;
    expect(third.kind === 'better' && third.fresh).toBe(false);
  });

  it('a touch on the drawing puts the last check away, and a refused one changes nothing', () => {
    const checked = checkMirror(drawing(path, [[0, 1]]), yours).challenge;
    const touched = unwrap(drawVine(checked, path, 2, 3));
    expect(touched.shown).toBeNull();
    expect(drawVine(touched, path, 1, 2)).toEqual({
      ok: false,
      error: { code: 'twoSilver', vertex: 1 },
    });
  });

  it(`after ${MISSES_BEFORE_SPARED} checks that do not win, the player is spared, once`, () => {
    let challenge = startChallenge(path);
    const spared: boolean[] = [];
    for (let k = 0; k < MISSES_BEFORE_SPARED + 1; k++) {
      const turn = checkMirror(challenge, yours);
      challenge = turn.challenge;
      spared.push(turn.check.kind === 'notBetter' && turn.check.spared);
    }
    expect(spared.indexOf(true)).toBe(MISSES_BEFORE_SPARED - 1);
    expect(spared.filter(Boolean)).toHaveLength(1);
  });

  it('a reflection drawn whole (by a hint) replaces the drawing and puts the check away', () => {
    const checked = checkMirror(drawing(path, [[0, 1]]), yours).challenge;
    const better = unwrap(
      createMatching(path, [
        [0, 1],
        [2, 3],
      ]),
    );
    const drawn = drawReflection(checked, better);
    expect(drawn.draft).toBe(better);
    expect(drawn.shown).toBeNull();
    expect(drawn.misses).toBe(1);
  });

  it('Berge: any reflection larger than yours leaves a thread that is a chain of yours', () => {
    fc.assert(
      fc.property(graphWithTwoMatchingsArb({ maxN: 9 }), ([graph, mine, theirs]) => {
        fc.pre(size(theirs) > size(mine));
        const { check } = checkMirror(drawReflection(startChallenge(graph), theirs), mine);
        expect(check.kind).toBe('better');
        if (check.kind !== 'better') return;
        expect(checkAugmentingPath(graph, mine, check.piece.sprouts).ok).toBe(true);
      }),
    );
  });

  it('the mentor draws a better reflection whenever there is one, and the check accepts it', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, mine]) => {
        const better: Matching | null = betterReflection(graph, mine);
        if (isMaximum(graph, mine)) {
          expect(better).toBeNull();
          return;
        }
        expect(better).not.toBeNull();
        if (better === null) return;
        const { check } = checkMirror(drawReflection(startChallenge(graph), better), mine);
        expect(check.kind === 'better' && check.fresh).toBe(true);
      }),
    );
  });
});
