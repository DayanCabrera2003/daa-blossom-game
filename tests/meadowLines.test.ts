import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The loose lines of the Meadow (plan 10, phase 11): what Sauce says after the day replays a garden
 * the player may have solved another way, and the even loop of 1.7 that 4.3 recalls.
 */

const TABLE: Readonly<Record<string, string>> = lines;

/** The script of level `id`, as the catalog builds it. */
function flowOf(id: string) {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level.data.flow;
}

/** The text of every line said in a `say` step right after a replay of the day, in level `id`. */
function afterReplay(id: string): string[] {
  const flow = flowOf(id);
  return flow.flatMap((step, index) => {
    const next = flow[index + 1];
    if (step.step !== 'replay' || next?.step !== 'say') return [];
    return next.lines.map((line) => TABLE[line] ?? '');
  });
}

describe('the replays of 1.1 and 1.2', () => {
  it.each(['1.1', '1.2'])(
    'after the replay of %s Sauce shows another way, never "what you did"',
    (id) => {
      const said = afterReplay(id);
      expect(said.length).toBeGreaterThan(0);
      for (const text of said) {
        expect(text).toMatch(/^Mira otra forma de ver/);
        expect(text).not.toMatch(/lo que hiciste|pasaste el farol/i);
      }
    },
  );
});

describe('the even loop of 1.7 and its echo in 4.3', () => {
  it('1.7 closes with a Sauce line about the ring, after the play', () => {
    const flow = flowOf('1.7');
    expect(flow.map((step) => step.step)).toEqual(['play', 'say']);
    const last = flow.at(-1);
    if (last?.step !== 'say') throw new Error('1.7 does not close with a line');
    expect(last.lines).toEqual(['ch1.7.sauce.03']);
    expect(TABLE['ch1.7.sauce.03']).toMatch(/corro/);
  });

  it('4.3 opens recalling the ring of the Meadow', () => {
    const first = flowOf('4.3')[0];
    if (first?.step !== 'say') throw new Error('4.3 does not open with a line');
    expect(first.lines.map((line) => TABLE[line]).join(' ')).toMatch(/corro del Prado/);
  });
});
