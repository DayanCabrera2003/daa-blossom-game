import { describe, expect, it } from 'vitest';
import { completeGraph, cycleGraph, pathGraph } from '../generators/families';
import { randomGraph } from '../generators/random';
import type { Graph } from '../graph/types';
import { createRng } from '../shared/rng';
import { benchmark, race } from './benchmark';

/** A sparse random garden with about three vines per sprout, grown from its size as seed. */
const sparse = (n: number): Graph => randomGraph(n, Math.min(1, 3 / n), createRng(n));
/** A garden where every other pair of sprouts shares a vine. */
const half = (n: number): Graph => randomGraph(n, 0.5, createRng(n));

describe('the race against Bruto (chapter 6)', () => {
  it('all three runners agree on a small garden (race I, 6 sprouts)', () => {
    const result = race(half(6), 1_000_000);
    expect(result).toMatchObject({ n: 6, bruto: { status: 'complete' } });
    expect(result.lanterns).toBeGreaterThan(0);
    expect(result.didacticSteps).toBeGreaterThan(0);
    expect(result.fastOperations).toBeGreaterThan(0);
  });

  it('Bruto falls asleep on a big garden without overspending his budget (race II)', () => {
    const result = race(half(32), 100_000);
    expect(result.bruto.status).toBe('gaveUp');
    expect(result.bruto.steps).toBeLessThanOrEqual(100_000);
  });

  it('measures a whole series in order, one row per size (the chart of level 6.5)', () => {
    const rows = benchmark([6, 8, 10], half, 1_000_000);
    expect(rows.map((row) => row.n)).toEqual([6, 8, 10]);
    expect(rows.every((row) => row.bruto.status === 'complete')).toBe(true);
  });

  it('the recipe grows polynomially: doubling the garden costs at most ×8 (n³)', () => {
    for (const grow of [pathGraph, cycleGraph, completeGraph, sparse, half]) {
      const rows = benchmark([16, 32, 64], grow, 0);
      for (let i = 1; i < rows.length; i++) {
        const [small, large] = [rows[i - 1], rows[i]] as const;
        expect(large?.fastOperations).toBeLessThanOrEqual(8 * (small?.fastOperations ?? 0));
        expect(large?.didacticSteps).toBeLessThanOrEqual(8 * (small?.didacticSteps ?? 0));
      }
    }
  });

  it('Bruto grows exponentially: doubling the garden costs him far more than ×8', () => {
    for (const grow of [pathGraph, half]) {
      const [small, large] = benchmark([8, 16], grow, 10_000_000);
      expect(large?.bruto.status).toBe('complete');
      expect(large?.bruto.steps).toBeGreaterThan(40 * (small?.bruto.steps ?? 0));
    }
  });
});
