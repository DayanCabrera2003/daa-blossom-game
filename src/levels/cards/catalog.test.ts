import { runRecipe } from '@core/recipe/run';
import { applyAction } from '@core/rules/applyAction';
import { itemAt } from '@core/shared/itemAt';
import { describe, expect, it } from 'vitest';
import { buildCards, cardDemos } from './catalog';
import cardsFile from './cards.json';
import { CARD_IDS } from './schema';

const write = (ids: readonly string[]) =>
  ids.map((id) => ({
    id,
    sprouts: [
      { label: 'a', x: 20, y: 27 },
      { label: 'b', x: 60, y: 27 },
    ],
    vines: [['a', 'b']],
    steps: [{ type: 'join', u: 'a', v: 'b' }],
  }));

describe('the mechanic cards file', () => {
  it('has one card for every mechanic, and every demo plays with the real rules', () => {
    const built = buildCards(cardsFile);
    expect(built).toMatchObject({ ok: true });
    expect([...cardDemos().keys()].sort()).toEqual([...CARD_IDS].sort());
  });

  it("the automaton's card shows the run of the recipe in its tiny garden, untouched by hand", () => {
    const demo = cardDemos().get('automaton');
    if (demo === undefined) throw new Error('the automaton has a card');
    const dawn = itemAt(demo.frames, 0).state;
    const moves = runRecipe(dawn, { fold: true });
    // One frame per move, then the sun dragged back, then the last frame.
    expect(demo.frames).toHaveLength(moves.length + 2);
    expect(demo.frames.map((frame) => frame.gesture.kind)).toEqual([
      ...moves.map(() => 'none'),
      'sun',
      'none',
    ]);
    // Each frame shows the garden the run's move before it leaves.
    for (const [index, move] of moves.entries()) {
      const outcome = applyAction(itemAt(demo.frames, index).state, move);
      expect(outcome.ok && outcome.state).toEqual(itemAt(demo.frames, index + 1).state);
    }
  });

  it('a card missing or written twice is an error', () => {
    expect(buildCards(write(CARD_IDS.slice(1)))).toEqual({
      ok: false,
      error: { code: 'missing', id: 'lanterns' },
    });
    expect(buildCards(write([...CARD_IDS, 'sun']))).toEqual({
      ok: false,
      error: { code: 'repeated', id: 'sun' },
    });
  });

  it('a file of the wrong shape, or a demo that does not play, says where', () => {
    expect(buildCards([{ id: 'nope' }])).toMatchObject({ ok: false, error: { code: 'schema' } });
    const broken = write(CARD_IDS).map((card) =>
      card.id === 'chain' ? { ...card, steps: [{ type: 'join', u: 'a', v: 'a' }] } : card,
    );
    expect(buildCards(broken)).toMatchObject({
      ok: false,
      error: { code: 'demo', id: 'chain', error: { code: 'refused', step: 0 } },
    });
  });
});
