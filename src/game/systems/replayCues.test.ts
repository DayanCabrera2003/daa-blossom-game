import { describe, expect, it } from 'vitest';
import { cycleGraph, pathGraph } from '@core/generators/families';
import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { createGardenState, type GardenState } from '@core/rules/state';
import { ASSET_KEYS } from '../assets/keys';
import { REPLAY_VOLUME, replayCues } from './replayCues';

const EVERY: ActionType[] = [
  'join',
  'split',
  'inspect',
  'markRoot',
  'markMoon',
  'fold',
  'unfold',
  'placeScarecrow',
  'removeScarecrow',
  'liftStone',
  'dropStone',
];

/** The garden after `action`, which the rules must accept. */
function after(state: GardenState, action: Action): GardenState {
  const outcome = applyAction(state, action);
  if (!outcome.ok) throw new Error(`refused: ${outcome.reason.code}`);
  return outcome.state;
}

/** The single key a replayed step plays, at the replay's volume. */
function keyOf(from: GardenState, to: GardenState): string | null {
  const cues = replayCues(from, to);
  expect(cues.length).toBeLessThanOrEqual(1);
  for (const cue of cues) {
    expect(cue.at).toBe(0);
    expect(cue.volume).toBe(REPLAY_VOLUME);
    expect(ASSET_KEYS).toContain(cue.key);
  }
  return cues[0]?.key ?? null;
}

const path = (): GardenState => createGardenState({ graph: pathGraph(6), allowed: EVERY });

describe('the sounds of a replayed day', () => {
  it('plays softer than the move itself', () => {
    expect(REPLAY_VOLUME).toBeGreaterThan(0);
    expect(REPLAY_VOLUME).toBeLessThan(1);
  });

  it('climbs the scale as lanterns are lit: the more lanterns, the higher the chime', () => {
    const dark = path();
    const one = after(dark, { type: 'join', u: 0, v: 1 });
    const two = after(one, { type: 'join', u: 2, v: 3 });
    expect(keyOf(dark, one)).toBe('sfx.chime1');
    expect(keyOf(one, two)).toBe('sfx.chime2');
  });

  it('puts a lantern out with its own sound', () => {
    const one = after(path(), { type: 'join', u: 0, v: 1 });
    expect(keyOf(one, after(one, { type: 'split', u: 0, v: 1 }))).toBe('sfx.putOut');
  });

  it('rings a lantern that moved without a new one', () => {
    const one = after(path(), { type: 'join', u: 0, v: 1 });
    const moved = { ...one, matching: { mate: [-1, 2, 1, -1, -1, -1] } };
    expect(keyOf(one, moved)).toBe('sfx.chime1');
  });

  it('folds and unfolds a flower with its chords', () => {
    const empty = createGardenState({ graph: cycleGraph(3), allowed: EVERY });
    const lit = after(empty, { type: 'join', u: 1, v: 2 });
    const folded = after(lit, { type: 'fold', loop: [0, 1, 2] });
    expect(keyOf(lit, folded)).toBe('sfx.fold');
    const [flower] = folded.layer.nodes;
    if (flower?.kind !== 'blossom') throw new Error('the loop folds into one flower');
    expect(keyOf(folded, after(folded, { type: 'unfold', blossom: flower.id }))).toBe('sfx.unfold');
  });

  it('marks suns and moons, and clears a search, as the move does', () => {
    const dark = path();
    const sun = after(dark, { type: 'markRoot', vertex: 0 });
    expect(keyOf(dark, sun)).toBe('sfx.markSun');
    const lit = after(dark, { type: 'join', u: 1, v: 2 });
    const root = after(lit, { type: 'markRoot', vertex: 0 });
    expect(keyOf(root, after(root, { type: 'markMoon', from: 0, to: 1 }))).toBe('sfx.markMoon');
    expect(keyOf(sun, dark)).toBe('sfx.searchCleared');
  });

  it('places stones and scarecrows, and inspects the fog', () => {
    const dark = path();
    expect(keyOf(dark, { ...dark, stones: [2] })).toBe('sfx.stone');
    expect(keyOf(dark, after(dark, { type: 'placeScarecrow', vertex: 2 }))).toBe('sfx.scarecrow');
    const fog = createGardenState({ graph: pathGraph(3), fog: true, allowed: EVERY });
    expect(keyOf(fog, after(fog, { type: 'inspect', vertex: 1 }))).toBe('sfx.inspect');
  });

  it('is silent for a step that changes nothing heard', () => {
    const dark = path();
    expect(keyOf(dark, dark)).toBeNull();
  });
});
