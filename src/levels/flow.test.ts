import { describe, expect, it } from 'vitest';
import { flowSchema } from './flow';

/** Parses a flow that must be valid. */
const parse = (flow: unknown) => flowSchema.parse(flow);
const accepts = (flow: unknown) => flowSchema.safeParse(flow).success;

describe('the script of a level (flow)', () => {
  it('is "play until won" when the level does not write one', () => {
    expect(parse(undefined)).toEqual([{ step: 'play', reactions: [] }]);
  });

  it('reads every kind of step, filling in the defaults', () => {
    const flow = parse([
      { step: 'say', lines: ['ch1.8.sauce.00'] },
      { step: 'bet', prompt: 'ch1.6.sauce.01', range: 6, preview: 3000 },
      {
        step: 'play',
        reactions: [
          { on: 'gainZeroChain', say: ['ch1.4.sauce.05'] },
          { on: 'lanterns', value: 3, say: ['ch1.4.sauce.06'] },
        ],
      },
      { step: 'sun' },
      { step: 'replay', demo: [{ type: 'join', u: 'B', v: 'C' }] },
      { step: 'replay' },
      {
        step: 'ask',
        prompt: 'ch1.8.sauce.01',
        options: [
          { line: 'ch1.8.sauce.02', correct: true, reply: 'ch1.8.sauce.04' },
          { line: 'ch1.8.sauce.03', correct: false },
        ],
        retry: true,
      },
      { step: 'mirror' },
      { step: 'explore' },
      { step: 'separate' },
      { step: 'count', prompt: 'ch2.1.sauce.03', piece: 'a', of: 'mirror', range: 4 },
      { step: 'draw', attempts: 3 },
      { step: 'notebook' },
    ]);
    expect(flow).toHaveLength(13);
    expect(flow[1]).toEqual({
      step: 'bet',
      prompt: 'ch1.6.sauce.01',
      range: 6,
      preview: 3000,
      informal: false,
    });
    expect(flow[6]).toMatchObject({ step: 'ask', retry: true });
  });

  it('asks only once unless the level says to retry', () => {
    const ask = parse([
      {
        step: 'ask',
        prompt: 'ch0.4.sauce.01',
        options: [
          { line: 'ch0.4.sauce.02', correct: true },
          { line: 'ch0.4.sauce.03', correct: false },
        ],
      },
    ]);
    expect(ask[0]).toMatchObject({ retry: false });
  });

  it('rejects unknown steps, unknown fields and empty scripts', () => {
    expect(accepts([{ step: 'dance' }])).toBe(false);
    expect(accepts([{ step: 'sun', fraction: 1 }])).toBe(false);
    expect(accepts([])).toBe(false);
  });

  it('a say step says something, in line ids', () => {
    expect(accepts([{ step: 'say', lines: [] }])).toBe(false);
    expect(accepts([{ step: 'say', lines: ['hello'] }])).toBe(false);
  });

  it('a lanterns reaction says at how many lanterns it fires; a gain-zero one does not', () => {
    expect(
      accepts([{ step: 'play', reactions: [{ on: 'lanterns', say: ['ch1.4.sauce.01'] }] }]),
    ).toBe(false);
    expect(
      accepts([
        { step: 'play', reactions: [{ on: 'gainZeroChain', value: 1, say: ['ch1.4.sauce.01'] }] },
      ]),
    ).toBe(false);
  });

  it('numeric questions offer at least 0 and 1, and a demo replays at least one move', () => {
    expect(accepts([{ step: 'bet', prompt: 'ch1.6.sauce.01', range: 0 }])).toBe(false);
    expect(
      accepts([{ step: 'count', prompt: 'ch2.1.sauce.03', piece: 'a', of: 'theirs', range: 3 }]),
    ).toBe(false);
    expect(accepts([{ step: 'replay', demo: [] }])).toBe(false);
    expect(accepts([{ step: 'draw', attempts: 0 }])).toBe(false);
  });

  it('reads the conflict steps of 4.2: pointing at a vine and counting the loop', () => {
    const flow = [
      { step: 'pickVine', prompt: 'ch4.2.sauce.01', reply: 'ch4.2.sauce.02' },
      { step: 'pickVine', prompt: 'ch4.2.sauce.01' },
      { step: 'count', prompt: 'ch4.2.sauce.03', of: 'loop', range: 6 },
    ];
    expect(parse(flow)).toEqual(flow);
  });

  it('a loop is counted without a piece, and the lanterns of a piece are not', () => {
    expect(
      accepts([{ step: 'count', prompt: 'ch4.2.sauce.03', piece: 'b', of: 'loop', range: 6 }]),
    ).toBe(false);
    expect(accepts([{ step: 'count', prompt: 'ch2.1.sauce.03', of: 'yours', range: 3 }])).toBe(
      false,
    );
    expect(accepts([{ step: 'pickVine' }])).toBe(false);
    expect(accepts([{ step: 'pickVine', prompt: 'ch4.2.sauce.01', retry: false }])).toBe(false);
  });

  it('reads the step where the light searches by itself (4.1, 4.2), which takes no fields', () => {
    expect(parse([{ step: 'autoSearch' }])).toEqual([{ step: 'autoSearch' }]);
    expect(accepts([{ step: 'autoSearch', from: 'R' }])).toBe(false);
  });

  it('reads the flower challenge (4.11): chains drawn `attempts` times, at least once', () => {
    expect(parse([{ step: 'flowerChallenge', attempts: 3 }])).toEqual([
      { step: 'flowerChallenge', attempts: 3 },
    ]);
    expect(accepts([{ step: 'flowerChallenge', attempts: 0 }])).toBe(false);
    expect(accepts([{ step: 'flowerChallenge' }])).toBe(false);
  });

  it('reads the recipe step (6.1), whole or with the cards of some cases missing (6.3)', () => {
    expect(parse([{ step: 'recipe' }])).toEqual([{ step: 'recipe', missing: [] }]);
    expect(parse([{ step: 'recipe', missing: ['sameTree'] }])).toEqual([
      { step: 'recipe', missing: ['sameTree'] },
    ]);
    expect(accepts([{ step: 'recipe', missing: ['fold'] }])).toBe(false);
    expect(accepts([{ step: 'recipe', missing: ['moon', 'moon'] }])).toBe(false);
  });

  it('reads the automaton step (6.2, 6.3): the recipe of the player, or a fixed one less some cases', () => {
    expect(parse([{ step: 'automaton' }])).toEqual([{ step: 'automaton' }]);
    expect(parse([{ step: 'automaton', missing: ['sameTree'] }])).toEqual([
      { step: 'automaton', missing: ['sameTree'] },
    ]);
    expect(accepts([{ step: 'automaton', missing: ['fold'] }])).toBe(false);
    expect(accepts([{ step: 'automaton', missing: ['moon', 'moon'] }])).toBe(false);
  });

  it('reads the race step (6.4, 6.5): a garden by family, size and seed, and Bruto’s budget', () => {
    const race = { step: 'race', family: 'half', size: 16, seed: 26, budget: 1_000_000 };
    expect(parse([race])).toEqual([race]);
    expect(accepts([{ ...race, family: 'wild' }])).toBe(false);
    // Small enough to draw in miniature, and to race in the browser at once.
    expect(accepts([{ ...race, size: 65 }])).toBe(false);
    expect(accepts([{ ...race, size: 1 }])).toBe(false);
    expect(accepts([{ ...race, budget: 2_000_001 }])).toBe(false);
    expect(accepts([{ ...race, budget: 0 }])).toBe(false);
  });

  it('reads the doubling bet (6.5): on the automaton or on Bruto, never a number', () => {
    const bet = { step: 'raceBet', prompt: 'ch6.5.sauce.01', runner: 'bruto' };
    expect(parse([bet])).toEqual([bet]);
    expect(accepts([{ ...bet, runner: 'sauce' }])).toBe(false);
    expect(accepts([{ ...bet, range: 3 }])).toBe(false);
  });

  describe('a question may refute a false answer with a garden, as the notebook does', () => {
    /** A small garden that refutes, written as a notebook's counterexample. */
    const garden = {
      mode: 'play',
      line: 'ch3.8.sauce.14',
      sprouts: [
        { label: 'A', x: 160, y: 127 },
        { label: 'B', x: 240, y: 127 },
      ],
      vines: [['A', 'B']],
      actions: ['join'],
    };
    /** An ask whose options are `right` and `wrong`, asked again after a wrong answer. */
    const asking = (right: object, wrong: object, retry = true) => [
      {
        step: 'ask',
        prompt: 'ch3.8.sauce.11',
        options: [
          { line: 'ch3.8.sauce.12', correct: true, ...right },
          { line: 'ch3.8.sauce.13', correct: false, ...wrong },
        ],
        retry,
      },
    ];

    it('reads the garden of a false answer', () => {
      const [ask] = parse(asking({}, { counterexample: garden }));
      expect(ask).toMatchObject({ options: [{}, { counterexample: { mode: 'play' } }] });
    });

    it('never on the right answer', () => {
      expect(accepts(asking({ counterexample: garden }, {}))).toBe(false);
    });

    it('only in a question asked again, which the player meets once back from the garden', () => {
      expect(accepts(asking({}, { counterexample: garden }, false))).toBe(false);
    });
  });

  it('a question offers at least two options', () => {
    const lonely = {
      step: 'ask',
      prompt: 'ch0.4.sauce.01',
      options: [{ line: 'ch0.4.sauce.02', correct: true }],
    };
    expect(accepts([lonely])).toBe(false);
  });
});
