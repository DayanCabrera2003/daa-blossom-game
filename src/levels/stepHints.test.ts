import { buildLevel, type Level } from './build';
import { levelSchema } from './schema';
import { describe, expect, it } from 'vitest';
import { hintsAt } from './stepHints';

/** A two-sprout level whose script plays, asks, plays again and draws, with hints here and there. */
function scripted(): Level {
  const ask = (hints?: { line: string; highlight?: string[] }[]) => ({
    step: 'ask',
    prompt: 'ch0.1.sauce.02',
    options: [
      { line: 'ch0.1.sauce.03', correct: true },
      { line: 'ch0.1.sauce.04', correct: false, reply: 'ch0.1.sauce.05' },
    ],
    ...(hints === undefined ? {} : { hints }),
  });
  const data = levelSchema.parse({
    id: '0.1',
    sprouts: [
      { label: 'A', x: 200, y: 135 },
      { label: 'B', x: 280, y: 135 },
    ],
    vines: [['A', 'B']],
    goal: { visible: true, value: 1 },
    victory: { type: 'matchingSize', value: 1 },
    hints: [{ line: 'ch0.1.sauce.01', highlight: ['A', 'B'] }],
    flow: [
      { step: 'play' },
      ask(),
      ask([{ line: 'ch0.1.sauce.06', highlight: ['B'] }]),
      { step: 'play', hints: [{ line: 'ch0.1.sauce.07' }] },
      { step: 'say', lines: ['ch0.1.sauce.00'] },
      { step: 'draw', attempts: 1, beatable: false },
    ],
    solution: [{ type: 'join', u: 'A', v: 'B' }],
  });
  const built = buildLevel(data);
  if (!built.ok) throw new Error('the test level builds');
  return built.value;
}

describe('the hints a step of the script offers', () => {
  const level = scripted();

  it('a play step that brings none says the level hints', () => {
    expect(hintsAt(level, 0)).toEqual([{ line: 'ch0.1.sauce.01', highlight: [0, 1] }]);
  });

  it('a question that brings none offers none; one that brings its own says them', () => {
    expect(hintsAt(level, 1)).toBeNull();
    expect(hintsAt(level, 2)).toEqual([{ line: 'ch0.1.sauce.06', highlight: [1] }]);
  });

  it('a play step with its own hints says them instead of the level hints', () => {
    expect(hintsAt(level, 3)).toEqual([{ line: 'ch0.1.sauce.07', highlight: [] }]);
  });

  it('lines, a mirror challenge nobody can win and the end of the script offer none', () => {
    expect(hintsAt(level, 4)).toBeNull();
    expect(hintsAt(level, 5)).toBeNull();
    expect(hintsAt(level, 6)).toBeNull();
  });
});
