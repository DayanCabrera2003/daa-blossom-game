import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { POND, POND_SPROUTS, pondLevel } from '../../../tests/support/pondGarden';
import { act, respond, startSession } from '../systems/levelSession';
import { pondPicture } from './pond';

const positions = POND_SPROUTS.map(({ x, y }) => ({ x, y }));
const labels = POND_SPROUTS.map(({ label }) => label);
const id = (name: string): number => POND[name] as number;

/** The 2.1 script: the reflection, a touch to explore, a touch to separate. */
const explored = pondLevel([{ step: 'mirror' }, { step: 'explore' }, { step: 'separate' }]);

describe('the picture of the pond', () => {
  it('nothing to draw in a garden with no reflection, or before the reflection appears', () => {
    const plain = catalog().find((level) => level.data.id === '1.3');
    expect(plain && pondPicture(startSession(plain, 0), positions, labels)).toBeNull();
    const later = pondLevel([{ step: 'separate' }, { step: 'mirror' }]);
    expect(pondPicture(startSession(later, 0), positions, labels)).toBeNull();
  });

  it('your strands are amber, the reflection’s silver, the shared pair fades', () => {
    const picture = pondPicture(startSession(explored, 0), positions, labels);
    const sides = picture?.strands.map((strand) => strand.side);
    expect(sides).toEqual([
      'mirror',
      'yours',
      'mirror',
      'yours',
      'mirror',
      'yours',
      'mirror',
      'yours',
      'mirror',
      'shared',
    ]);
    expect(picture?.strands[0]).toEqual({
      a: positions[0],
      b: positions[1],
      side: 'mirror',
      piece: 0,
    });
    expect(picture?.strands[9]).toEqual({
      a: positions[id('e')],
      b: positions[id('f')],
      side: 'shared',
      piece: null,
    });
    expect(picture?.sprouts.map((sprout) => sprout.label)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(picture?.sprouts[0]).toEqual({ at: positions[0], label: '1', lit: false, piece: 0 });
    expect(picture).toMatchObject({
      offsets: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      separated: false,
      dissolved: false,
      degree: null,
    });
  });

  it('the touched sprout shows how many strands it has', () => {
    const touched = respond(startSession(explored, 0), { type: 'tapSprout', vertex: id('3') }, 0);
    expect(pondPicture(touched.session, positions, labels)?.degree).toEqual({
      at: positions[id('3')],
      piece: 0,
      text: { key: 'pond.strands', params: { count: 2 } },
    });
    const lone = respond(startSession(explored, 0), { type: 'tapSprout', vertex: id('e') }, 0);
    expect(pondPicture(lone.session, positions, labels)?.degree).toMatchObject({
      piece: null,
      text: { key: 'pond.strands', params: { count: 0 } },
    });
  });

  it('once separated, the pieces drift apart', () => {
    const touched = respond(startSession(explored, 0), { type: 'tapSprout', vertex: id('1') }, 0);
    const separated = respond(touched.session, { type: 'tap' }, 0).session;
    const picture = pondPicture(separated, positions, labels);
    expect(picture?.separated).toBe(true);
    expect(picture?.offsets).toHaveLength(2);
    expect(picture?.offsets.some((offset) => offset.x !== 0 || offset.y !== 0)).toBe(true);
  });

  it('while playing it follows your lanterns, and dissolves when you tie (2.3)', () => {
    const level = pondLevel();
    const before = pondPicture(startSession(level, 0), positions, labels);
    expect(before?.dissolved).toBe(false);
    const chain = { type: 'chain' as const, path: [0, 1, 2, 3, 4, 5] };
    const tied = act(startSession(level, 0), chain, 0).session;
    const after = pondPicture(tied, positions, labels);
    expect(after?.dissolved).toBe(true);
    // Your lanterns are now the reflection's on the thread: only the loop is left in the tangle.
    expect(after?.strands.filter((strand) => strand.side === 'shared')).toHaveLength(4);
    expect(after?.offsets).toHaveLength(1);
  });
});
