import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { initialPointer } from '../input/pointer';
import { HINT_DELAY_MS } from '../systems/hints';
import { act, startSession, undoSession } from '../systems/levelSession';
import { hudPicture } from './hud';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

describe('the picture of the HUD', () => {
  it('a visible goal, the lanterns lit, and only the tools unlocked so far (level 1.1)', () => {
    const session = startSession(levelById('1.1'), 0);
    expect(hudPicture(session, initialPointer('lanterns'), 0)).toEqual({
      goal: { key: 'hud.goal', params: { count: 2 } },
      lanterns: 0,
      water: null,
      canUndo: false,
      canRedo: false,
      canDeclareDone: false,
      hintAvailable: false,
      sun: { fraction: 1, steps: 1 },
      tools: ['lanterns'],
      tool: 'lanterns',
      won: null,
    });
  });

  it('a hidden goal asks the question instead (4.9); "Terminé" is at hand', () => {
    const hud = hudPicture(startSession(levelById('4.9'), 0), initialPointer('marks'), 0);
    expect(hud.goal).toEqual({ key: 'hud.goalHidden', params: {} });
    expect(hud.canDeclareDone).toBe(true);
    expect(hud.tools).toEqual(['lanterns', 'marks', 'foldLoop', 'inspect', 'scarecrows']);
  });

  it('follows the day: undo, redo and the sun position move with the history', () => {
    const level = levelById('1.1');
    const played = level.solution.reduce(
      (s, action) => act(s, action, 0).session,
      startSession(level, 0),
    );
    const back = undoSession(played);
    const hud = hudPicture(back, initialPointer('lanterns'), 0);
    expect(hud).toMatchObject({ canUndo: true, canRedo: true, sun: { fraction: 2 / 3, steps: 4 } });
    expect(hudPicture(played, initialPointer('lanterns'), 0).won).not.toBeNull();
  });

  it('offers a hint when it is time', () => {
    const session = startSession(levelById('1.1'), 0);
    expect(hudPicture(session, initialPointer('lanterns'), HINT_DELAY_MS).hintAvailable).toBe(true);
  });

  it('shows the water in levels with fog or a budget', () => {
    const foggy = loadLevel({
      id: '3.1',
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 200, y: 100 },
      ],
      vines: [['A', 'B']],
      goal: { visible: true, value: 1 },
      fog: true,
      water: 4,
      victory: { type: 'matchingSize', value: 1 },
      solution: [{ type: 'join', u: 'A', v: 'B' }],
    });
    if (!foggy.ok) throw new Error('fixture does not load');
    const looked = act(startSession(foggy.value, 0), { type: 'inspect', vertex: 0 }, 0).session;
    expect(hudPicture(looked, initialPointer('inspect'), 0).water).toEqual({ used: 1, budget: 4 });
  });

  it('hides the sun before level 0.5, where it unlocks; undo and redo are there from 0.1', () => {
    const at = (id: string) => {
      const loaded = loadLevel({
        id,
        sprouts: [
          { label: 'A', x: 100, y: 100 },
          { label: 'B', x: 200, y: 100 },
        ],
        vines: [['A', 'B']],
        goal: { visible: true, value: 1 },
        victory: { type: 'matchingSize', value: 1 },
        solution: [{ type: 'join', u: 'A', v: 'B' }],
      });
      if (!loaded.ok) throw new Error('fixture does not load');
      const played = act(startSession(loaded.value, 0), { type: 'join', u: 0, v: 1 }, 0).session;
      return hudPicture(played, initialPointer('lanterns'), 0);
    };
    for (const id of ['0.1', '0.2', '0.3', '0.4']) {
      expect(at(id)).toMatchObject({ sun: null, canUndo: true });
    }
    for (const id of ['0.5', '1.1']) expect(at(id).sun).toEqual({ fraction: 1, steps: 2 });
  });
});
