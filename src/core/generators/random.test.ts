import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRng } from '../shared/rng';
import { randomGraph } from './random';

describe('random garden G(n, p)', () => {
  it('the same seed grows the same garden', () => {
    expect(randomGraph(20, 0.3, createRng(7))).toEqual(randomGraph(20, 0.3, createRng(7)));
  });

  it('p = 0 grows no vines and p = 1 grows them all', () => {
    expect(randomGraph(6, 0, createRng(1)).edges).toEqual([]);
    expect(randomGraph(6, 1, createRng(1)).edges).toHaveLength(15);
  });

  it('keeps about a fraction p of the possible vines', () => {
    const graph = randomGraph(100, 0.2, createRng(42));
    const fraction = graph.edges.length / ((100 * 99) / 2);
    expect(fraction).toBeGreaterThan(0.17);
    expect(fraction).toBeLessThan(0.23);
  });

  it('rejects impossible sizes or probabilities', () => {
    expect(() => randomGraph(-1, 0.5, createRng(1))).toThrow();
    expect(() => randomGraph(5, 1.5, createRng(1))).toThrow();
    expect(() => randomGraph(5, Number.NaN, createRng(1))).toThrow();
  });

  it('property: always a valid simple graph on n sprouts', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 30 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer(),
        (n, p, seed) => {
          const graph = randomGraph(n, p, createRng(seed));
          expect(graph.n).toBe(n);
          for (const [u, v] of graph.edges) expect(u < v && v < n).toBe(true);
        },
      ),
    );
  });
});
