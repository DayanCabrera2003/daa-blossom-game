import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import { pondWords } from './pondWords';
import type { PondPiece } from './pondPicture';

const t = createTranslator(strings);
const names = ['1', '2', '3', '4', 'a', 'b', 'c', 'd'];

const thread: PondPiece = { kind: 'thread', sprouts: [0, 1, 2, 3], yours: 1, mirror: 2, gain: 1 };
const loop: PondPiece = { kind: 'loop', sprouts: [4, 5, 6, 7], yours: 2, mirror: 2, gain: 0 };

describe('the words of the pond', () => {
  it('counts the lanterns of each side while the gardens are shown whole', () => {
    for (const view of ['yours', 'mirror', 'together'] as const) {
      expect(pondWords(view, [thread, loop], { yours: 3, mirror: 4 }, names, t)).toEqual([
        'Tus faroles: 3. Los del reflejo: 4.',
      ]);
    }
  });

  it('tells each piece of the tangle, who holds more on it and what that means', () => {
    expect(pondWords('pieces', [thread, loop], { yours: 3, mirror: 4 }, names, t)).toEqual([
      'Hilo 1–2–3–4: tú 1, el reflejo 2. El reflejo gana por 1: es una cadena tuya.',
      'Bucle a–b–c–d: tú 2, el reflejo 2. Empatan.',
    ]);
    const yoursWin: PondPiece = { ...thread, yours: 2, mirror: 1, gain: -1 };
    expect(pondWords('pieces', [yoursWin], { yours: 2, mirror: 1 }, names, t)).toEqual([
      'Hilo 1–2–3–4: tú 2, el reflejo 1. Ganas tú por 1.',
    ]);
  });

  it('says when the two gardens light the same lanterns and there is no tangle at all', () => {
    expect(pondWords('pieces', [], { yours: 2, mirror: 2 }, names, t)).toEqual([
      t('diagram.pond.none'),
    ]);
    expect(t('diagram.pond.none')).not.toMatch(/^‹/);
  });
});
