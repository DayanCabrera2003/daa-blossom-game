import { describe, expect, it } from 'vitest';
import type { Action } from '@core/rules/actions';
import type { TraceEvent } from '@core/trace/events';
import { DURATIONS, planAnimation, type AnimationStep } from '../animation/plan';
import { ASSET_KEYS, assetEntry } from '../assets/keys';
import type { Effect } from './levelController';
import { effectCues, planCues, refusalCues } from './soundCues';

/** One step of every kind the plan has. */
const EVERY_STEP: readonly AnimationStep[] = [
  { kind: 'hop', from: 0, to: 1, duration: DURATIONS.hop },
  { kind: 'light', u: 0, v: 1, duration: DURATIONS.light },
  { kind: 'putOut', u: 0, v: 1, duration: DURATIONS.putOut },
  { kind: 'mark', vertex: 0, mark: 'sun', duration: DURATIONS.mark },
  { kind: 'mark', vertex: 1, mark: 'moon', duration: DURATIONS.mark },
  { kind: 'conflict', u: 0, v: 1, duration: DURATIONS.conflict },
  { kind: 'fold', blossom: 3, duration: DURATIONS.fold },
  { kind: 'unfold', blossom: 3, duration: DURATIONS.unfold },
  { kind: 'reveal', vertex: 2, duration: DURATIONS.reveal },
  { kind: 'chain', path: [0, 1], duration: DURATIONS.chain },
  { kind: 'clear', duration: DURATIONS.clear },
  { kind: 'place', vertex: 2, object: 'stone', placed: true, duration: DURATIONS.stone },
  { kind: 'place', vertex: 2, object: 'scarecrow', placed: true, duration: DURATIONS.place },
];

/** When each step of a plan starts, in milliseconds from the start of the plan. */
const startsOf = (steps: readonly AnimationStep[]): number[] =>
  steps.map((_, i) => steps.slice(0, i).reduce((sum, step) => sum + step.duration, 0));

const keysAt = (steps: readonly AnimationStep[], at: number): string[] =>
  planCues(steps)
    .filter((cue) => cue.at === at)
    .map((cue) => cue.key);

const ACTION: Action = { type: 'join', u: 0, v: 1 };

describe('the sounds of an animation plan', () => {
  it.each(EVERY_STEP.map((step) => [step.kind, step] as const))(
    'gives a %s step a sound of the manifest, from its very start',
    (_kind, step) => {
      const cues = planCues([step]);
      expect(cues.some((cue) => cue.at === 0)).toBe(true);
      for (const cue of cues) {
        expect(ASSET_KEYS).toContain(cue.key);
        expect(assetEntry(cue.key).kind).toBe('sfx');
      }
    },
  );

  it('starts a sound at the start of each step of a longer plan', () => {
    for (const start of startsOf(EVERY_STEP)) {
      expect(keysAt(EVERY_STEP, start).length).toBeGreaterThan(0);
    }
  });

  it('names the sound of each kind of step after section 1.8', () => {
    const first = (step: AnimationStep): string | undefined => planCues([step])[0]?.key;
    const [, , putOut, sun, moon, conflict, fold, unfold, reveal, chain, clear, stone, crow] =
      EVERY_STEP.map(first);
    expect([putOut, sun, moon, conflict]).toEqual([
      'sfx.putOut',
      'sfx.markSun',
      'sfx.markMoon',
      'sfx.conflict',
    ]);
    expect([fold, unfold, reveal, chain, clear]).toEqual([
      'sfx.fold',
      'sfx.unfold',
      'sfx.inspect',
      'sfx.chainFound',
      'sfx.searchCleared',
    ]);
    expect([stone, crow]).toEqual(['sfx.stone', 'sfx.scarecrow']);
  });

  it('lets a drop of water fall halfway through an inspection, which costs one', () => {
    const reveal = { kind: 'reveal', vertex: 2, duration: DURATIONS.reveal } as const;
    expect(planCues([reveal])).toEqual([
      { key: 'sfx.inspect', at: 0 },
      { key: 'sfx.waterDrop', at: DURATIONS.reveal / 2 },
    ]);
  });

  it('climbs the scale along a chain, one chime per hop, and sparkles as it lands', () => {
    const events: TraceEvent[] = [{ type: 'augment', path: [0, 1, 2, 3, 4] }];
    const cues = planCues(planAnimation(events));
    expect(cues).toEqual([
      { key: 'sfx.chime1', at: 0 },
      { key: 'sfx.chime2', at: DURATIONS.hop },
      { key: 'sfx.chime3', at: 2 * DURATIONS.hop },
      { key: 'sfx.chime4', at: 3 * DURATIONS.hop },
      { key: 'sfx.sparkle', at: 4 * DURATIONS.hop },
    ]);
  });

  it('starts every chain from the bottom of the scale', () => {
    const events: TraceEvent[] = [
      { type: 'augment', path: [0, 1, 2] },
      { type: 'labelOuter', vertex: 4, parent: null, root: 4 },
      { type: 'augment', path: [4, 5] },
    ];
    const chimes = planCues(planAnimation(events)).filter((cue) => cue.key.startsWith('sfx.chime'));
    expect(chimes.map((cue) => cue.key)).toEqual(['sfx.chime1', 'sfx.chime2', 'sfx.chime1']);
  });

  it('rings a lantern lit by hand on the scale too, without the sparkle of a chain', () => {
    const steps = planAnimation([{ type: 'light', u: 0, v: 1 }]);
    expect(planCues(steps)).toEqual([{ key: 'sfx.chime1', at: 0 }]);
  });

  it('is silent for an empty plan', () => {
    expect(planCues([])).toEqual([]);
  });
});

describe('the sounds of the effects of the controller', () => {
  it('plays the sounds of the plan of an accepted move', () => {
    const events: TraceEvent[] = [{ type: 'light', u: 0, v: 1 }];
    const effect: Effect = { kind: 'animate', action: ACTION, events };
    expect(effectCues(effect)).toEqual(planCues(planAnimation(events)));
  });

  it('answers every refusal with the gentle back sound, never a buzzer', () => {
    const refusals: Effect[] = [
      { kind: 'rejected', reason: { code: 'notNow' }, action: ACTION },
      { kind: 'drawRefused', reason: { code: 'notNow' } },
      {
        kind: 'flowerDrawn',
        attempt: { kind: 'notAChain', path: [0, 1], error: { code: 'tooShort' }, spared: false },
      },
    ];
    for (const effect of refusals)
      expect(effectCues(effect)).toEqual([{ key: 'sfx.reject', at: 0 }]);
  });

  it('is silent for what only the script shows', () => {
    const silent: Effect[] = [
      { kind: 'sun' },
      { kind: 'play' },
      { kind: 'answered', step: 0, value: 1, correct: true },
    ];
    for (const effect of silent) expect(effectCues(effect)).toEqual([]);
  });
});

describe('the sound of a refusal elsewhere', () => {
  it('is the same gentle sound, for screens with effects of their own', () => {
    expect(refusalCues()).toEqual([{ key: 'sfx.reject', at: 0 }]);
  });
});
