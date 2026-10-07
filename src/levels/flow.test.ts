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

  it('reads a count of the sprouts of the loop of a conflict (4.2)', () => {
    expect(parse([{ step: 'count', prompt: 'ch4.2.sauce.03', of: 'loop', range: 6 }])).toEqual([
      { step: 'count', prompt: 'ch4.2.sauce.03', of: 'loop', range: 6 },
    ]);
  });

  it('a loop is counted without a piece, and the lanterns of a piece are not', () => {
    expect(
      accepts([{ step: 'count', prompt: 'ch4.2.sauce.03', piece: 'b', of: 'loop', range: 6 }]),
    ).toBe(false);
    expect(accepts([{ step: 'count', prompt: 'ch2.1.sauce.03', of: 'yours', range: 3 }])).toBe(
      false,
    );
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
