import { createGraph } from '@core/graph/createGraph';
import { size } from '@core/matching/queries';
import { unwrap } from '@core/shared/result';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { drawnPairs, emptyDraft, toggleDraft } from './mirrorDraft';

/** A path a–b–c–d (ids 0…3). */
const path = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]),
);

describe('the reflection the player draws', () => {
  it('starts with no silver lantern', () => {
    expect(size(emptyDraft(path))).toBe(0);
    expect(drawnPairs(emptyDraft(path))).toEqual([]);
  });

  it('touching a vine puts it in silver, and touching it again takes it out', () => {
    const drawn = toggleDraft(path, emptyDraft(path), 1, 2);
    expect(drawn.ok && drawnPairs(drawn.value)).toEqual([[1, 2]]);
    if (!drawn.ok) return;
    // From either end, it is the same vine.
    const undrawn = toggleDraft(path, drawn.value, 2, 1);
    expect(undrawn.ok && size(undrawn.value)).toBe(0);
  });

  it('never leaves a sprout with two silver lanterns: the touch is refused, gently', () => {
    const one = unwrap(toggleDraft(path, emptyDraft(path), 0, 1));
    expect(toggleDraft(path, one, 1, 2)).toEqual({
      ok: false,
      error: { code: 'twoSilver', vertex: 1 },
    });
    const two = unwrap(toggleDraft(path, one, 2, 3));
    expect(drawnPairs(two)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('a pair of sprouts with no vine between them is no vine to draw', () => {
    expect(toggleDraft(path, emptyDraft(path), 0, 2)).toEqual({
      ok: false,
      error: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });

  it('whatever is touched, the drawing is always a set of lanterns of the garden', () => {
    fc.assert(
      fc.property(
        graphArb({ minN: 2, maxN: 8 }).chain((graph) =>
          fc.tuple(
            fc.constant(graph),
            fc.array(fc.tuple(fc.nat(graph.n - 1), fc.nat(graph.n - 1)), { maxLength: 20 }),
          ),
        ),
        ([graph, touches]) => {
          let draft = emptyDraft(graph);
          for (const [u, v] of touches) {
            const next = toggleDraft(graph, draft, u, v);
            if (next.ok) draft = next.value;
          }
          draft.mate.forEach((partner, v) => {
            if (partner !== -1) expect(draft.mate[partner]).toBe(v);
          });
          for (const [u, v] of drawnPairs(draft)) {
            expect(graph.edges.some(([a, b]) => a === u && b === v)).toBe(true);
          }
        },
      ),
    );
  });
});
