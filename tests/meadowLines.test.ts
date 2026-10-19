import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/**
 * The loose lines of the Meadow (plan 10, phase 11): what Sauce says after the day replays a garden
 * the player may have solved another way.
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
