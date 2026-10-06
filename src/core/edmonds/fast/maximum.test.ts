import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../../tests/support/arbitraries';
import { BRUTO_PROPERTY_TIMEOUT } from '../../../../tests/support/timeouts';
import { bruteForceMatching } from '../../bruteforce/maximumMatching';
import { pathGraph } from '../../generators/families';
import { createMatching } from '../../matching/createMatching';
import { size } from '../../matching/queries';
import { unwrap } from '../../shared/result';
import { isMaximum, maximumSize } from './maximum';

describe('maximum lanterns of a garden', () => {
  it('a path of four holds two lanterns: one in the middle is not the most', () => {
    const path = pathGraph(4);
    expect(maximumSize(path)).toBe(2);
    expect(isMaximum(path, unwrap(createMatching(path, [[1, 2]])))).toBe(false);
    expect(
      isMaximum(
        path,
        unwrap(
          createMatching(path, [
            [0, 1],
            [2, 3],
          ]),
        ),
      ),
    ).toBe(true);
  });

  it(
    'agrees with Bruto on every small garden and lantern set',
    () => {
      fc.assert(
        fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, matching]) => {
          const outcome = bruteForceMatching(graph);
          if (outcome.status !== 'complete') return;
          expect(maximumSize(graph)).toBe(size(outcome.matching));
          expect(isMaximum(graph, matching)).toBe(size(matching) === size(outcome.matching));
        }),
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );

  it('asking twice about the same garden gives the same answer', () => {
    const path = pathGraph(5);
    expect(maximumSize(path)).toBe(maximumSize(path));
  });
});
