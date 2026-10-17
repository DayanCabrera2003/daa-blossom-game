import type { LevelStep } from '@levels/flow';
import { describe, expect, it } from 'vitest';
import {
  advanceFlow,
  betRight,
  currentStep,
  isFinished,
  isPast,
  startFlow,
  type FlowEffect,
  type FlowSignal,
  type FlowState,
} from './flow';

const say = (...lines: string[]): LevelStep => ({ step: 'say', lines });
const play: LevelStep = { step: 'play', reactions: [] };
const ask = (retry: boolean): LevelStep => ({
  step: 'ask',
  prompt: 'ch1.8.sauce.01',
  options: [
    { line: 'ch1.8.sauce.02', correct: false, reply: 'ch1.8.sauce.03' },
    { line: 'ch1.8.sauce.04', correct: true },
  ],
  retry,
});
const bet = (informal: boolean): LevelStep => ({
  step: 'bet',
  prompt: 'ch1.6.sauce.01',
  range: 6,
  informal,
});

/** Notebook statements with nothing to say after them. */
const plainRight = { correct: true, reply: null, refuted: false };
const plainWrong = { correct: false, reply: null, refuted: false };

/** Starts a script with no notebook. */
const start = (steps: readonly LevelStep[]) => startFlow(steps, { notebook: [] });

/** Sends signals in order, collecting every effect. */
const send = (flow: FlowState, signals: readonly FlowSignal[]) => {
  let current = flow;
  const effects: FlowEffect[] = [];
  for (const signal of signals) {
    const next = advanceFlow(current, signal);
    current = next.flow;
    effects.push(...next.effects);
  }
  return { flow: current, effects };
};

describe('the script engine', () => {
  it('the default script starts by playing and finishes when the level is won', () => {
    const started = start([play]);
    expect(started.effects).toEqual([{ kind: 'play' }]);
    expect(currentStep(started.flow)).toEqual(play);
    const won = advanceFlow(started.flow, { type: 'won' });
    expect(won.effects).toEqual([{ kind: 'finished' }]);
    expect(isFinished(won.flow)).toBe(true);
    expect(currentStep(won.flow)).toBeNull();
  });

  it('steps that finish at once chain within the same call', () => {
    const started = start([say('ch0.1.sauce.00'), play]);
    expect(started.effects).toEqual([{ kind: 'say', lines: ['ch0.1.sauce.00'] }, { kind: 'play' }]);
    expect(start([say('ch0.1.sauce.00')]).effects).toEqual([
      { kind: 'say', lines: ['ch0.1.sauce.00'] },
      { kind: 'finished' },
    ]);
  });

  it('play → say → ask: winning says the lines and asks, in that order', () => {
    const { flow } = start([play, say('ch1.8.sauce.00'), ask(true)]);
    expect(advanceFlow(flow, { type: 'won' }).effects).toEqual([
      { kind: 'say', lines: ['ch1.8.sauce.00'] },
      {
        kind: 'ask',
        step: 2,
        prompt: 'ch1.8.sauce.01',
        options: ['ch1.8.sauce.02', 'ch1.8.sauce.04'],
      },
    ]);
  });

  it('a wrong answer with retry gives its reply and asks again; a right one finishes', () => {
    const asked = start([ask(true)]);
    const wrong = advanceFlow(asked.flow, { type: 'answer', option: 0, right: null });
    expect(wrong.effects).toEqual([
      { kind: 'answered', step: 0, value: 0, correct: false },
      { kind: 'say', lines: ['ch1.8.sauce.03'] },
      asked.effects[0],
    ]);
    expect(isFinished(wrong.flow)).toBe(false);
    const right = advanceFlow(wrong.flow, { type: 'answer', option: 1, right: null });
    expect(right.effects).toEqual([
      { kind: 'answered', step: 0, value: 1, correct: true },
      { kind: 'finished' },
    ]);
    expect(right.flow.answers).toEqual([
      { step: 0, value: 0, correct: false },
      { step: 0, value: 1, correct: true },
    ]);
  });

  it('without retry, any answer ends the question', () => {
    const { flow } = start([ask(false), play]);
    const wrong = advanceFlow(flow, { type: 'answer', option: 0, right: null });
    expect(wrong.effects.map((effect) => effect.kind)).toEqual(['answered', 'say', 'play']);
  });

  it('a step accepts only its own signal; any other changes nothing', () => {
    const { flow } = start([play, ask(true)]);
    for (const signal of [
      { type: 'answer', option: 1, right: null },
      { type: 'bet', value: 2, right: 2 },
      { type: 'sunMoved' },
      { type: 'tap' },
      { type: 'tapSprout', vertex: 0 },
      { type: 'mirrorChecked', better: true },
    ] as const) {
      expect(advanceFlow(flow, signal)).toEqual({ flow, effects: [] });
    }
    const asking = advanceFlow(flow, { type: 'won' }).flow;
    expect(advanceFlow(asking, { type: 'won' })).toEqual({ flow: asking, effects: [] });
  });

  it('a step never repeats once passed: a finished script ignores every signal', () => {
    const done = advanceFlow(start([play]).flow, { type: 'won' }).flow;
    expect(advanceFlow(done, { type: 'won' })).toEqual({ flow: done, effects: [] });
  });

  it('a formal bet is right when it names the most lanterns; an informal one earns nothing', () => {
    const formal = start([bet(false), play]);
    expect(formal.effects[0]).toEqual({
      kind: 'bet',
      step: 0,
      prompt: 'ch1.6.sauce.01',
      range: 6,
      preview: null,
      informal: false,
    });
    expect(betRight(formal.flow)).toBeNull();
    const placed = advanceFlow(formal.flow, { type: 'bet', value: 4, right: 4 });
    expect(placed.effects).toEqual([
      { kind: 'answered', step: 0, value: 4, correct: true },
      { kind: 'play' },
    ]);
    expect(betRight(placed.flow)).toBe(true);
    expect(betRight(advanceFlow(formal.flow, { type: 'bet', value: 5, right: 4 }).flow)).toBe(
      false,
    );
    const casual = start([
      { step: 'bet', prompt: 'ch0.4.sauce.01', range: 3, preview: 3000, informal: true },
    ]);
    expect(casual.effects[0]).toMatchObject({ preview: 3000, informal: true });
    expect(betRight(advanceFlow(casual.flow, { type: 'bet', value: 2, right: 2 }).flow)).toBeNull();
  });

  it('winning after a bet reveals the real value, before the steps that follow', () => {
    const betting = start([bet(false), play, say('ch1.6.sauce.02')]);
    const placed = advanceFlow(betting.flow, { type: 'bet', value: 5, right: 4 });
    expect(advanceFlow(placed.flow, { type: 'won' }).effects).toEqual([
      { kind: 'reveal', bet: 5, right: 4 },
      { kind: 'say', lines: ['ch1.6.sauce.02'] },
      { kind: 'finished' },
    ]);
    const unbet = advanceFlow(start([play, bet(false)]).flow, { type: 'won' });
    expect(unbet.effects.map((effect) => effect.kind)).toEqual(['bet']);
  });

  it('the sun step ends when the sun moves', () => {
    const { flow, effects } = start([{ step: 'sun' }]);
    expect(effects).toEqual([{ kind: 'sun' }]);
    expect(advanceFlow(flow, { type: 'sunMoved' }).effects).toEqual([{ kind: 'finished' }]);
  });

  it('replay and mirror happen at once; the demo goes to the scene as data', () => {
    const demo = [{ type: 'join', u: 1, v: 2 }] as const;
    expect(
      start([{ step: 'replay', demo }, { step: 'replay' }, { step: 'mirror' }]).effects,
    ).toEqual([
      { kind: 'replay', demo },
      { kind: 'replay', demo: null },
      { kind: 'mirror' },
      { kind: 'finished' },
    ]);
  });

  it('the light searches by itself and the script waits until it has been shown', () => {
    const started = start([say('ch4.1.sauce.00'), { step: 'autoSearch' }, play]);
    expect(started.effects).toEqual([
      { kind: 'say', lines: ['ch4.1.sauce.00'] },
      { kind: 'autoSearch', step: 1 },
    ]);
    expect(advanceFlow(started.flow, { type: 'tap' }).flow).toBe(started.flow);
    expect(advanceFlow(started.flow, { type: 'searched' }).effects).toEqual([{ kind: 'play' }]);
  });

  it('explore ends with a touch on a sprout, separate with a touch on the garden', () => {
    const { flow, effects } = start([{ step: 'explore' }, { step: 'separate' }]);
    expect(effects).toEqual([{ kind: 'explore' }]);
    expect(advanceFlow(flow, { type: 'tap' }).effects).toEqual([]);
    const tapped = advanceFlow(flow, { type: 'tapSprout', vertex: 3 });
    expect(tapped.effects).toEqual([{ kind: 'sproutTapped', vertex: 3 }, { kind: 'separate' }]);
    expect(advanceFlow(tapped.flow, { type: 'tap' }).effects).toEqual([{ kind: 'finished' }]);
  });

  it('remembers the sprout touched to explore, and which steps are behind', () => {
    const steps: LevelStep[] = [{ step: 'mirror' }, { step: 'explore' }, { step: 'separate' }];
    const { flow } = start(steps);
    expect(flow.touched).toBeNull();
    expect([isPast(flow, 'mirror'), isPast(flow, 'explore'), isPast(flow, 'separate')]).toEqual([
      true,
      false,
      false,
    ]);
    const tapped = advanceFlow(flow, { type: 'tapSprout', vertex: 3 }).flow;
    expect(tapped.touched).toBe(3);
    // Once explore is over, a touch on a sprout no longer changes the one remembered.
    expect(advanceFlow(tapped, { type: 'tapSprout', vertex: 5 }).flow.touched).toBe(3);
    const separated = advanceFlow(tapped, { type: 'tap' }).flow;
    expect(isPast(separated, 'separate')).toBe(true);
    expect(isPast(separated, 'draw')).toBe(false);
  });

  it('a count always asks again until the number the core gives', () => {
    const count: LevelStep = {
      step: 'count',
      prompt: 'ch2.1.sauce.05',
      piece: 4,
      of: 'mirror',
      range: 4,
    };
    const started = start([count]);
    expect(started.effects).toEqual([
      { kind: 'count', step: 0, prompt: 'ch2.1.sauce.05', range: 4 },
    ]);
    const wrong = advanceFlow(started.flow, { type: 'answer', option: 2, right: 3 });
    expect(wrong.effects).toEqual([
      { kind: 'answered', step: 0, value: 2, correct: false },
      started.effects[0],
    ]);
    expect(advanceFlow(wrong.flow, { type: 'answer', option: 3, right: 3 }).effects).toEqual([
      { kind: 'answered', step: 0, value: 3, correct: true },
      { kind: 'finished' },
    ]);
  });

  it('pointing at a vine asks again until the conflict; a wrong one hears the reply first', () => {
    const pick: LevelStep = { step: 'pickVine', prompt: 'ch4.2.sauce.01', reply: 'ch4.2.sauce.03' };
    const started = start([pick]);
    const opening = { kind: 'pickVine', step: 0, prompt: 'ch4.2.sauce.01' };
    expect(started.effects).toEqual([opening]);
    expect(advanceFlow(started.flow, { type: 'tap' }).effects).toEqual([]);
    const wrong = advanceFlow(started.flow, { type: 'pickVine', u: 2, v: 3, right: false });
    expect(wrong.flow.index).toBe(0);
    expect(wrong.effects).toEqual([
      { kind: 'vinePicked', step: 0, u: 2, v: 3, correct: false },
      { kind: 'say', lines: ['ch4.2.sauce.03'] },
      opening,
    ]);
    expect(advanceFlow(wrong.flow, { type: 'pickVine', u: 4, v: 2, right: true }).effects).toEqual([
      { kind: 'vinePicked', step: 0, u: 4, v: 2, correct: true },
      { kind: 'finished' },
    ]);
    const silent = start([{ step: 'pickVine', prompt: 'ch4.2.sauce.01' }]);
    expect(
      advanceFlow(silent.flow, { type: 'pickVine', u: 2, v: 3, right: false }).effects,
    ).toEqual([{ kind: 'vinePicked', step: 0, u: 2, v: 3, correct: false }, opening]);
  });

  it('the notebook ends only with a right option, which is written down', () => {
    const started = startFlow([{ step: 'notebook' }], { notebook: [plainWrong, plainRight] });
    expect(started.effects).toEqual([{ kind: 'notebook', step: 0 }]);
    const wrong = advanceFlow(started.flow, { type: 'answer', option: 0, right: null });
    expect(wrong.effects).toEqual([
      { kind: 'answered', step: 0, value: 0, correct: false },
      { kind: 'notebook', step: 0 },
    ]);
    expect(isFinished(wrong.flow)).toBe(false);
    expect(advanceFlow(wrong.flow, { type: 'answer', option: 1, right: null }).effects).toEqual([
      { kind: 'answered', step: 0, value: 1, correct: true },
      { kind: 'written' },
      { kind: 'finished' },
    ]);
  });

  it('a false statement is refuted by its garden or answered by the mentor, then asked again', () => {
    const notebook = [
      { correct: false, reply: 'ch1.5.sauce.04', refuted: false },
      { correct: false, reply: null, refuted: true },
      { correct: true, reply: 'ch1.5.sauce.05', refuted: false },
    ];
    const started = startFlow([play, { step: 'notebook' }], { notebook });
    const noting = advanceFlow(started.flow, { type: 'won' }).flow;
    expect(advanceFlow(noting, { type: 'answer', option: 0, right: null }).effects).toEqual([
      { kind: 'answered', step: 1, value: 0, correct: false },
      { kind: 'say', lines: ['ch1.5.sauce.04'] },
      { kind: 'notebook', step: 1 },
    ]);
    const refuted = advanceFlow(noting, { type: 'answer', option: 1, right: null });
    expect(refuted.effects).toEqual([
      { kind: 'answered', step: 1, value: 1, correct: false },
      { kind: 'counterexample', step: 1, option: 1 },
      { kind: 'notebook', step: 1 },
    ]);
    expect(advanceFlow(refuted.flow, { type: 'answer', option: 2, right: null }).effects).toEqual([
      { kind: 'answered', step: 1, value: 2, correct: true },
      { kind: 'say', lines: ['ch1.5.sauce.05'] },
      { kind: 'written' },
      { kind: 'finished' },
    ]);
  });

  it('the mirror challenge ends after its attempts at better reflections', () => {
    const { flow, effects } = start([{ step: 'draw', attempts: 2 }]);
    expect(effects).toEqual([{ kind: 'draw', attempts: 2 }]);
    const tried = send(flow, [
      { type: 'mirrorChecked', better: true },
      { type: 'mirrorChecked', better: false },
    ]);
    expect(tried.flow.attempts).toBe(1);
    expect(tried.effects).toEqual([]);
    expect(advanceFlow(tried.flow, { type: 'mirrorChecked', better: true }).effects).toEqual([
      { kind: 'finished' },
    ]);
  });

  it('the mirror challenge also ends when the player is spared, whatever the attempts', () => {
    const { flow } = start([{ step: 'draw', attempts: 3 }, say('ch0.1.sauce.00')]);
    const tried = advanceFlow(flow, { type: 'mirrorChecked', better: true }).flow;
    expect(advanceFlow(tried, { type: 'mirrorSpared' }).effects).toEqual([
      { kind: 'say', lines: ['ch0.1.sauce.00'] },
      { kind: 'finished' },
    ]);
    // Anywhere else, being spared means nothing.
    const asking = start([ask(true)]).flow;
    expect(advanceFlow(asking, { type: 'mirrorSpared' })).toEqual({ flow: asking, effects: [] });
  });

  it('the flower challenge ends after its chains, or when the player is spared', () => {
    const { flow, effects } = start([{ step: 'flowerChallenge', attempts: 2 }]);
    expect(effects).toEqual([{ kind: 'flowerChallenge', step: 0, attempts: 2 }]);
    const tried = send(flow, [
      { type: 'flowerDrawn', chain: true },
      { type: 'flowerDrawn', chain: false },
      { type: 'mirrorChecked', better: true },
    ]);
    expect(tried.flow.attempts).toBe(1);
    expect(tried.effects).toEqual([]);
    expect(advanceFlow(tried.flow, { type: 'flowerDrawn', chain: true }).effects).toEqual([
      { kind: 'finished' },
    ]);
    expect(advanceFlow(flow, { type: 'flowerSpared' }).effects).toEqual([{ kind: 'finished' }]);
    // Anywhere else, a chain drawn means nothing.
    const asking = start([ask(true)]).flow;
    expect(advanceFlow(asking, { type: 'flowerDrawn', chain: true }).effects).toEqual([]);
  });

  it('an option that is not on offer is no answer', () => {
    const asking = start([ask(true)]).flow;
    expect(advanceFlow(asking, { type: 'answer', option: 2, right: null }).effects).toEqual([]);
    const noting = startFlow([{ step: 'notebook' }], { notebook: [plainRight] }).flow;
    expect(advanceFlow(noting, { type: 'answer', option: 1, right: null }).effects).toEqual([]);
    expect(advanceFlow(noting, { type: 'tap' })).toEqual({ flow: noting, effects: [] });
    const counting = start([
      { step: 'count', prompt: 'ch2.1.sauce.05', piece: 0, of: 'yours', range: 3 },
    ]).flow;
    expect(advanceFlow(counting, { type: 'answer', option: 1, right: null }).effects).toEqual([]);
  });

  it('a step done at once waits for nothing, even if a state were left on it', () => {
    const stuck: FlowState = { ...start([say('ch0.1.sauce.00')]).flow, index: 0 };
    expect(advanceFlow(stuck, { type: 'tap' })).toEqual({ flow: stuck, effects: [] });
  });
});
