import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { pondLevel } from '../../../tests/support/pondGarden';
import { initialPointer } from '../input/pointer';
import { HINT_DELAY_MS } from '../systems/hints';
import { act, respond, startSession, undoSession } from '../systems/levelSession';
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
    // One step back from the end of a day of `moves` moves, which holds `moves + 1` gardens.
    const moves = level.solution.length;
    expect(hud).toMatchObject({
      canUndo: true,
      canRedo: true,
      sun: { fraction: (moves - 1) / moves, steps: moves + 1 },
    });
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

  it('with a bet made and the goal hidden, the HUD recalls the bet (1.6)', () => {
    const betting = (visible: boolean) => {
      const loaded = loadLevel({
        id: '1.6',
        sprouts: [
          { label: 'A', x: 100, y: 100 },
          { label: 'B', x: 200, y: 100 },
        ],
        vines: [['A', 'B']],
        goal: visible ? { visible: true, value: 1 } : { visible: false },
        flow: [{ step: 'bet', prompt: 'ch1.6.sauce.01', range: 3 }, { step: 'play' }],
        victory: { type: 'matchingSize', value: 1 },
        solution: [
          { type: 'bet', value: 2 },
          { type: 'join', u: 'A', v: 'B' },
        ],
      });
      if (!loaded.ok) throw new Error('fixture does not load');
      return startSession(loaded.value, 0);
    };
    const pointer = initialPointer('lanterns');
    const hidden = betting(false);
    expect(hudPicture(hidden, pointer, 0).goal).toEqual({ key: 'hud.goalHidden', params: {} });
    const bet = respond(hidden, { type: 'bet', value: 2 }, 0).session;
    expect(hudPicture(bet, pointer, 0).goal).toEqual({ key: 'hud.bet', params: { count: 2 } });
    const won = act(bet, { type: 'join', u: 0, v: 1 }, 0).session;
    expect(hudPicture(won, pointer, 0).goal).toEqual({ key: 'hud.bet', params: { count: 2 } });
    const shown = respond(betting(true), { type: 'bet', value: 2 }, 0).session;
    expect(hudPicture(shown, pointer, 0).goal).toEqual({ key: 'hud.goal', params: { count: 1 } });
  });

  it('with the reflection shown, the goal sets your lanterns against it; a tie dissolves it', () => {
    const pointer = initialPointer('lanterns');
    const hidden = startSession(pondLevel([{ step: 'separate' }, { step: 'mirror' }]), 0);
    expect(hudPicture(hidden, pointer, 0).goal).toEqual({ key: 'hud.goal', params: { count: 6 } });
    const shown = startSession(pondLevel(), 0);
    expect(hudPicture(shown, pointer, 0).goal).toEqual({
      key: 'hud.mirror',
      params: { yours: 5, mirror: 6 },
    });
    const tied = act(shown, { type: 'chain', path: [0, 1, 2, 3, 4, 5] }, 0).session;
    expect(hudPicture(tied, pointer, 0).goal).toEqual({ key: 'hud.goal', params: { count: 6 } });
  });
});
