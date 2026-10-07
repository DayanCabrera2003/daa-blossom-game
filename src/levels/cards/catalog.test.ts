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
