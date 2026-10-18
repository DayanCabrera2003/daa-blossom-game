import { describe, expect, it } from 'vitest';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { catalog } from '@levels/catalog';
import type { DiagramMove } from './diagramSpec';
import { chainOf, targetName, targetOf, touchDiagram, type DiagramTarget } from './diagramTouch';

const startOf = (id: string): GardenState => {
  const level = catalog().find((one) => one.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level.start;
};

const sprout = (vertex: number): DiagramTarget => ({ kind: 'sprout', vertex });
const lanterns: ReadonlySet<DiagramMove> = new Set(['join', 'split', 'passLantern']);
const chains: ReadonlySet<DiagramMove> = new Set(['chain', 'split']);

describe('touchDiagram, with lanterns to join and pass', () => {
  const garden = startOf('1.1');

  it('holds a sprout in the dark, then joins it to the next one in the dark', () => {
    const first = touchDiagram(garden, lanterns, [], sprout(1));
    expect(first).toEqual({ action: null, touched: [1] });
    expect(touchDiagram(garden, lanterns, first.touched, sprout(2))).toEqual({
      action: { type: 'join', u: 1, v: 2 },
      touched: [],
    });
  });

  it('lets go when the same sprout is touched again or a dark vine is touched', () => {
    expect(touchDiagram(garden, lanterns, [1], sprout(1))).toEqual({ action: null, touched: [] });
    expect(touchDiagram(garden, lanterns, [1], { kind: 'vine', u: 1, v: 2 })).toEqual({
      action: null,
      touched: [],
    });
  });

  it('puts out a lit vine, passes a lantern to a lit sprout, and never holds a lit one', () => {
    const joined = applyAction(garden, { type: 'join', u: 1, v: 2 });
    if (!joined.ok) throw new Error('B–C is a vine');
    const lit = joined.state;
    expect(touchDiagram(lit, lanterns, [], { kind: 'vine', u: 1, v: 2 }).action).toEqual({
      type: 'split',
      u: 1,
      v: 2,
    });
    expect(touchDiagram(lit, lanterns, [0], sprout(1)).action).toEqual({
      type: 'passLantern',
      from: 0,
      to: 1,
    });
    expect(touchDiagram(lit, lanterns, [], sprout(1))).toEqual({ action: null, touched: [] });
  });

  it('does nothing with a move the block does not allow', () => {
    const joinOnly: ReadonlySet<DiagramMove> = new Set(['join']);
    const joined = applyAction(garden, { type: 'join', u: 1, v: 2 });
    if (!joined.ok) throw new Error('B–C is a vine');
    expect(touchDiagram(joined.state, joinOnly, [0], sprout(1))).toEqual({
      action: null,
      touched: [],
    });
    expect(
      touchDiagram(joined.state, joinOnly, [], { kind: 'vine', u: 1, v: 2 }).action,
    ).toBeNull();
  });
});

describe('touchDiagram, drawing a chain', () => {
  const garden = startOf('1.3');

  it('adds each sprout touched to the chain, and takes back the last one touched again', () => {
    let touched: readonly number[] = [];
    for (const vertex of [0, 1, 2]) {
      const outcome = touchDiagram(garden, chains, touched, sprout(vertex));
      expect(outcome.action).toBeNull();
      touched = outcome.touched;
    }
    expect(touched).toEqual([0, 1, 2]);
    expect(touchDiagram(garden, chains, touched, sprout(2)).touched).toEqual([0, 1]);
  });

  it('keeps the chain when a dark vine is touched, and puts out a lit one', () => {
    expect(touchDiagram(garden, chains, [0, 1], { kind: 'vine', u: 0, v: 1 })).toEqual({
      action: null,
      touched: [0, 1],
    });
    expect(touchDiagram(garden, chains, [0, 1], { kind: 'vine', u: 1, v: 2 })).toEqual({
      action: { type: 'split', u: 1, v: 2 },
      touched: [],
    });
  });

  it('passes the chain drawn, once it has a vine, only where chains are allowed', () => {
    expect(chainOf([0, 1, 2, 3, 4, 5], chains)).toEqual({
      type: 'chain',
      path: [0, 1, 2, 3, 4, 5],
    });
    expect(chainOf([0], chains)).toBeNull();
    expect(chainOf([0, 1], lanterns)).toBeNull();
  });
});

describe('targetOf and targetName', () => {
  it('name a sprout and a vine so the picture can carry them, and read them back', () => {
    expect(targetName({ kind: 'sprout', vertex: 3 })).toBe('s3');
    expect(targetName({ kind: 'vine', u: 1, v: 2 })).toBe('v1-2');
    expect(targetOf('s3')).toEqual({ kind: 'sprout', vertex: 3 });
    expect(targetOf('v1-2')).toEqual({ kind: 'vine', u: 1, v: 2 });
  });

  it('name a folded flower by its id, and read it back', () => {
    expect(targetName({ kind: 'flower', id: 4 })).toBe('f4');
    expect(targetOf('f4')).toEqual({ kind: 'flower', id: 4 });
  });

  it('a touch on a flower asks the rules for nothing in a garden to play', () => {
    expect(touchDiagram(startOf('1.3'), chains, [0], { kind: 'flower', id: 0 })).toEqual({
      action: null,
      touched: [0],
    });
  });

  it('read nothing from a name that is neither', () => {
    expect(targetOf('x')).toBeNull();
    expect(targetOf('s')).toBeNull();
    expect(targetOf('v1')).toBeNull();
    expect(targetOf('f')).toBeNull();
  });
});
