import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { everyChain, plantedFlowerArb } from '../../../tests/support/plantedFlower';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { unwrap } from '../shared/result';
import { cutAtFlower } from './cutAtFlower';

// A garden like 4.11: the flower b–c=d–f=g–b with its base b in the dark, exits c–e, d–h, g–t,
// the lit pair h=x leading to t, and e–t outside. b c d f g e t h x = 0 1 2 3 4 5 6 7 8.
const graph = unwrap(
  createGraph(9, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 0],
    [1, 5],
    [2, 7],
    [7, 8],
    [8, 6],
    [4, 6],
    [5, 6],
  ]),
);
const matching = unwrap(
  createMatching(graph, [
    [1, 2],
    [3, 4],
    [7, 8],
  ]),
);
const flower = [0, 1, 2, 3, 4];

describe('cutting a chain of the open garden at a flower (flower lemma, hard direction)', () => {
  it('follows the chain from an end outside the flower up to the first petal it touches', () => {
    const cut = cutAtFlower(graph, matching, flower, [6, 8, 7, 2, 1, 5]);
    expect(cut.chain).toEqual([6, 8, 7, 2, 1, 5]);
    expect(cut.stretch).toEqual([6, 8, 7, 2]);
    expect(cut.petal).toBe(2);
    // Folded: the flower takes the base's place (0); e t h x close up to 1 2 3 4.
    expect(cut.flowerNode).toBe(0);
    expect(cut.projected).toEqual([2, 4, 3, 0]);
    expect(cut.folded.graph.n).toBe(5);
  });

  it('turns a chain that starts at the base round, so it starts outside', () => {
    const cut = cutAtFlower(graph, matching, flower, [0, 4, 3, 2, 1, 5]);
    expect(cut.chain).toEqual([5, 1, 2, 3, 4, 0]);
    expect(cut.stretch).toEqual([5, 1]);
    expect(cut.petal).toBe(1);
    expect(cut.projected).toEqual([1, 0]);
  });

  it('a chain that never touches the flower is already a chain of the folded garden', () => {
    const cut = cutAtFlower(graph, matching, flower, [5, 6]);
    expect(cut.stretch).toEqual([5, 6]);
    expect(cut.petal).toBeNull();
    expect(cut.projected).toEqual([1, 2]);
    expect(checkAugmentingPath(cut.folded.graph, cut.folded.matching, cut.projected).ok).toBe(true);
  });

  it('refuses what is no chain, and a flower whose base holds a lantern', () => {
    expect(() => cutAtFlower(graph, matching, flower, [6, 8, 7])).toThrow(/not a chain/);
    // The triangle 0–1=2–0 whose base 0 shares a lantern with 3; 4–5 is a chain apart.
    const lit = unwrap(
      createGraph(6, [
        [0, 1],
        [1, 2],
        [2, 0],
        [0, 3],
        [4, 5],
      ]),
    );
    const lanterns = unwrap(
      createMatching(lit, [
        [1, 2],
        [0, 3],
      ]),
    );
    expect(() => cutAtFlower(lit, lanterns, [0, 1, 2], [4, 5])).toThrow(/base/);
  });

  it('for every planted flower with a dark base and every chain, the stretch is a chain folded', () => {
    fc.assert(
      fc.property(plantedFlowerArb(), ({ graph: g, matching: m, flower: f }) => {
        for (const chain of everyChain(g, m)) {
          const cut = cutAtFlower(g, m, f, chain);
          expect(f.includes(cut.chain[0] as number)).toBe(false);
          expect(cut.stretch).toEqual(cut.chain.slice(0, cut.stretch.length));
          const petals = cut.stretch.filter((v) => f.includes(v));
          expect(petals).toEqual(cut.petal === null ? [] : [cut.petal]);
          const folded = checkAugmentingPath(cut.folded.graph, cut.folded.matching, cut.projected);
          expect(folded.ok).toBe(true);
          if (cut.petal !== null) expect(cut.projected.at(-1)).toBe(cut.flowerNode);
        }
      }),
    );
  });
});
