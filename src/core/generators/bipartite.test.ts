import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bipartition } from '../graph/bipartition';
import { createRng } from '../shared/rng';
import { randomBipartiteGraph } from './bipartite';

describe('random garden of bees and flowers', () => {
  it('the same seed grows the same garden', () => {
    expect(randomBipartiteGraph(6, 5, 0.4, createRng(3))).toEqual(
      randomBipartiteGraph(6, 5, 0.4, createRng(3)),
    );
  });

  it('p = 0 grows no vines and p = 1 joins every bee to every flower', () => {
    expect(randomBipartiteGraph(3, 4, 0, createRng(1)).edges).toEqual([]);
    const full = randomBipartiteGraph(3, 4, 1, createRng(1));
    expect(full.n).toBe(7);
    expect(full.edges).toHaveLength(12);
  });

  it('puts the bees first and the flowers after them', () => {
    const graph = randomBipartiteGraph(2, 3, 1, createRng(9));
    for (const [u, v] of graph.edges) {
      expect(u).toBeLessThan(2);
      expect(v).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects impossible sizes or probabilities', () => {
    expect(() => randomBipartiteGraph(-1, 2, 0.5, createRng(1))).toThrow();
    expect(() => randomBipartiteGraph(2, 1.5, 0.5, createRng(1))).toThrow();
    expect(() => randomBipartiteGraph(2, 2, 2, createRng(1))).toThrow();
    expect(() => randomBipartiteGraph(2, 2, Number.NaN, createRng(1))).toThrow();
  });

  it('property: every vine joins a bee to a flower, so the garden is bipartite', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 12 }),
        fc.nat({ max: 12 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer(),
        (a, b, p, seed) => {
          const graph = randomBipartiteGraph(a, b, p, createRng(seed));
          expect(graph.n).toBe(a + b);
          for (const [u, v] of graph.edges) expect(u < a && v >= a).toBe(true);
          expect(bipartition(graph).kind).toBe('bipartite');
        },
      ),
    );
  });
});
