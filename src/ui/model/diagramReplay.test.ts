import { describe, expect, it } from 'vitest';
import { edmonds } from '@core/edmonds/solve';
import { encodeGarden } from '@core/codes/gardenCode';
import { unwrap } from '@core/shared/result';
import { stateAt } from '@core/trace/replay';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { gardenAtPlay } from '@levels/playStart';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import { replaySteps } from './diagramReplay';
import { snapshotOf } from './gardenSnapshot';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

describe('replaySteps from a run of Edmonds', () => {
  it('starts at dawn and ends where the core replays the whole trace, one step per event shown', () => {
    for (const id of ['4.6', '5.1']) {
      const garden = gardenOf(id);
      const run = edmonds(garden.start.graph, garden.start.matching);
      const steps = unwrap(replaySteps(garden, 'edmonds'));
      expect(steps[0]?.events).toEqual([]);
      expect(steps[0]?.moment.snapshot).toEqual(stateAt(garden.start.matching, run.trace, 0));
      expect(steps.at(-1)?.moment.snapshot).toEqual(
        stateAt(garden.start.matching, run.trace, run.trace.length),
      );
      // The looks along each vine change nothing on the garden: they are not steps of their own.
      const shown = run.trace.filter((event) => event.type !== 'scanEdge');
      expect(steps.slice(1).flatMap((step) => step.events)).toEqual(shown);
    }
  });

  it('folds the nested flowers of 5.1 and opens them again', () => {
    const steps = unwrap(replaySteps(gardenOf('5.1'), 'edmonds'));
    const types = steps.flatMap((step) => step.events.map((event) => event.type));
    expect(types.filter((type) => type === 'contract')).toHaveLength(2);
    expect(types.filter((type) => type === 'expand')).toHaveLength(2);
    expect(steps.some((step) => step.moment.snapshot.flowers.some((f) => f.parent !== null))).toBe(
      true,
    );
  });
});

describe('replaySteps from the reference solution', () => {
  it('plays the solution of 4.6 from where its play begins, folding five petals and opening them', () => {
    const garden = gardenOf('4.6');
    const steps = unwrap(replaySteps(garden, 'solution'));
    expect(steps).toHaveLength((garden.level?.solution.length ?? 0) + 1);
    const level = garden.level;
    if (level === null) throw new Error('4.6 is a level');
    expect(steps[0]?.moment.snapshot).toEqual(snapshotOf(gardenAtPlay(level)));
    const contract = steps
      .flatMap((step) => step.events)
      .find((event) => event.type === 'contract');
    expect(contract?.type === 'contract' && contract.cycle.length).toBe(5);
    expect(steps.some((step) => step.events.some((event) => event.type === 'expand'))).toBe(true);
    expect(steps.at(-1)?.moment.snapshot.flowers).toEqual([]);
  });

  it('carries the scarecrows and stones of the day', () => {
    const steps = unwrap(replaySteps(gardenOf('3.8'), 'solution'));
    expect(steps.some((step) => step.moment.scarecrows.length > 0)).toBe(true);
    const stones = unwrap(replaySteps(gardenOf('7.3'), 'solution'));
    expect(stones.some((step) => step.moment.stones.length > 0)).toBe(true);
  });

  it('has no solution to play without a level', () => {
    const ring = unwrap(diagramGarden({ card: 'chain' }, sources));
    expect(replaySteps(ring, 'solution')).toEqual({ ok: false, error: { code: 'noSolution' } });
  });

  it('says which move the rules refused, if one is', () => {
    const garden = gardenOf('1.1');
    const level = garden.level;
    if (level === null) throw new Error('1.1 is a level');
    const broken = {
      ...garden,
      level: { ...level, solution: [{ type: 'split' as const, u: 0, v: 1 }] },
    };
    expect(replaySteps(broken, 'solution')).toEqual({
      ok: false,
      error: { code: 'refused', step: 0, reason: { code: 'notLit', u: 0, v: 1 } },
    });
  });
});

describe('replaySteps from the light and the mechanical gardener', () => {
  it('replays the light searching 4.1 by itself, never folding', () => {
    const steps = unwrap(replaySteps(gardenOf('4.1'), 'autoSearch'));
    expect(steps.length).toBeGreaterThan(3);
    const types = steps.flatMap((step) => step.events.map((event) => event.type));
    expect(types).toContain('labelInner');
    expect(types).not.toContain('contract');
  });

  it('replays the gardener of 6.2 following the right recipe to its end', () => {
    const steps = unwrap(replaySteps(gardenOf('6.2'), 'recipe'));
    const types = steps.flatMap((step) => step.events.map((event) => event.type));
    expect(types).toContain('augment');
    expect(types.at(-1)).toBe('declareDone');
  });

  it('replays a garden code too', () => {
    const level = gardenOf('1.1');
    const code = encodeGarden(level.start.graph, level.start.matching);
    const garden = unwrap(diagramGarden({ code }, sources));
    const steps = unwrap(replaySteps(garden, 'edmonds'));
    expect(steps.at(-1)?.events).toEqual([{ type: 'done', size: 2 }]);
  });
});
