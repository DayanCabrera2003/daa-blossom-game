import type { TraceEvent } from '@core/trace/events';
import { describe, expect, it } from 'vitest';
import { BURST_MS } from '../picture/burst';
import { CONFLICT_BLINKS } from '../picture/conflictBlink';
import { FOLD_FRAMES } from '../picture/foldFrames';
import { STONE_FALL_MS, STONE_SETTLE_MS } from '../picture/stoneSplit';
import { DURATIONS, planAnimation, stepAt, totalDuration } from './plan';

describe('animation plan of a move', () => {
  it('a chain makes the lantern hop vine by vine, in order (GDD §4.1, key animation 1)', () => {
    const steps = planAnimation([{ type: 'augment', path: [0, 1, 2, 3] }]);
    expect(steps).toEqual([
      { kind: 'hop', from: 0, to: 1, duration: DURATIONS.hop },
      { kind: 'hop', from: 1, to: 2, duration: DURATIONS.hop },
      { kind: 'hop', from: 2, to: 3, duration: DURATIONS.hop },
    ]);
  });

  it('each move of the player becomes its own step; bookkeeping events show nothing', () => {
    const events: TraceEvent[] = [
      { type: 'searchStart', roots: [0] },
      { type: 'scanEdge', from: 0, to: 1 },
      { type: 'light', u: 0, v: 1 },
      { type: 'putOut', u: 0, v: 1 },
      { type: 'labelOuter', vertex: 0, parent: null, root: 0 },
      { type: 'labelInner', vertex: 1, parent: 0, root: 0 },
      { type: 'oddCycleFound', vine: [2, 4] },
      { type: 'contract', blossom: 0, base: 2, cycle: [] },
      { type: 'expand', blossom: 0 },
      { type: 'inspect', vertex: 3, vines: [2] },
      { type: 'chainFound', path: [0, 1] },
      { type: 'searchCleared' },
      { type: 'scarecrow', vertex: 2, placed: true },
      { type: 'stone', vertex: 2, lifted: false },
      { type: 'searchFailed' },
      { type: 'done', size: 2 },
      { type: 'declareDone' },
    ];
    expect(planAnimation(events).map((step) => step.kind)).toEqual([
      'light',
      'putOut',
      'mark',
      'mark',
      'conflict',
      'fold',
      'unfold',
      'reveal',
      'chain',
      'clear',
      'place',
      'place',
    ]);
  });

  it('a stone or a scarecrow says whether it is set down or taken off', () => {
    expect(
      planAnimation([
        { type: 'stone', vertex: 2, lifted: true },
        { type: 'scarecrow', vertex: 3, placed: false },
      ]),
    ).toEqual([
      { kind: 'place', vertex: 2, object: 'stone', placed: true, duration: DURATIONS.stone },
      { kind: 'place', vertex: 3, object: 'scarecrow', placed: false, duration: DURATIONS.place },
    ]);
  });

  it('marks say which mark they are', () => {
    expect(planAnimation([{ type: 'labelInner', vertex: 1, parent: 0, root: 0 }])).toEqual([
      { kind: 'mark', vertex: 1, mark: 'moon', duration: DURATIONS.mark },
    ]);
  });
});

describe('playing the plan', () => {
  const steps = planAnimation([{ type: 'augment', path: [0, 1, 2] }]);

  it('lasts as long as its steps together', () => {
    expect(totalDuration(steps)).toBe(2 * DURATIONS.hop);
    expect(totalDuration([])).toBe(0);
  });

  it('tells which step plays at a given time, and how far into it', () => {
    expect(stepAt(steps, 0)).toEqual({ index: 0, progress: 0 });
    expect(stepAt(steps, DURATIONS.hop / 2)).toEqual({ index: 0, progress: 0.5 });
    expect(stepAt(steps, DURATIONS.hop)).toEqual({ index: 1, progress: 0 });
  });

  it('after the end (or when the player acts again, which skips ahead) it is finished', () => {
    expect(stepAt(steps, 2 * DURATIONS.hop)).toBeNull();
    expect(stepAt([], 0)).toBeNull();
  });
});

describe('how long the key animations last (GDD §4.1)', () => {
  it('gives a hop time to crouch, fly and land, quicker than the sparkle where it lands', () => {
    expect(DURATIONS.hop).toBeGreaterThanOrEqual(200);
    expect(DURATIONS.hop).toBeLessThan(BURST_MS);
  });

  it('shows each of the eight frames of a fold for a moment the eye can catch', () => {
    expect(DURATIONS.fold / FOLD_FRAMES).toBeGreaterThanOrEqual(60);
    expect(DURATIONS.unfold).toBe(DURATIONS.fold);
  });

  it('blinks the conflict slowly enough to tell sun from moon', () => {
    expect(DURATIONS.conflict / (2 * CONFLICT_BLINKS)).toBeGreaterThanOrEqual(100);
  });

  it('lets a stone fall and settle, with time left for the garden to part', () => {
    expect(DURATIONS.stone).toBeGreaterThan(2 * (STONE_FALL_MS + STONE_SETTLE_MS));
  });
});
