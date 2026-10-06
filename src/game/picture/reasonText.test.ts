import strings from '@content/es/strings.json';
import type { Action } from '@core/rules/actions';
import type { RejectReason } from '@core/rules/reasons';
import { createTranslator } from '@services/i18n';
import { describe, expect, it } from 'vitest';
import { reasonText } from './reasonText';

const t = createTranslator(strings);
// Level 1.3: S–a=b–c=d–T with distractors b–x=y and c–z.
const labels = ['S', 'a', 'b', 'c', 'd', 'T', 'x', 'y', 'z'];
const say = (reason: RejectReason, action: Action = { type: 'declareDone' }) =>
  reasonText(reason, action, labels, t);

describe("why a move was refused, in the garden's words", () => {
  it('names the sprouts involved', () => {
    expect(say({ code: 'notAdjacent', u: 0, v: 2 })).toBe('S y b no comparten enredadera.');
    expect(say({ code: 'alreadyLit', vertex: 3 })).toBe('c ya tiene farol: un farol es para dos.');
  });

  it('points at the exact step of a chain that goes wrong (the distractor of 1.3)', () => {
    const chain: Action = { type: 'chain', path: [0, 1, 2, 3, 8] };
    expect(say({ code: 'invalidPath', error: { code: 'notAlternating', index: 3 } }, chain)).toBe(
      'Entre c y z irían dos enredaderas apagadas seguidas: quien ya tiene farol tiene que darlo antes de pedir otro.',
    );
    expect(
      say({ code: 'invalidPath', error: { code: 'endpointNotExposed', vertex: 1 } }, chain),
    ).toBe('a tiene farol: las cadenas empiezan en alguien a oscuras.');
  });

  it('points at the sprouts of a loop that is not a flower', () => {
    const loop: Action = { type: 'fold', loop: [2, 3, 4, 5] };
    expect(say({ code: 'notAFlower', error: { code: 'evenLength', length: 4 } }, loop)).toBe(
      'Un bucle de 4 brotes es par: los bucles pares no molestan.',
    );
    expect(say({ code: 'notAFlower', error: { code: 'notAdjacent', index: 3 } }, loop)).toBe(
      'T y b no comparten enredadera.',
    );
  });

  it('says which action is still locked, by its name', () => {
    expect(say({ code: 'actionLocked', action: 'foldAt' })).toBe(
      'Todavía no sabes plegar flores. Ya llegará.',
    );
  });

  it('never leaves a gap: every reason and sub-reason comes out whole', () => {
    const chain: Action = { type: 'chain', path: [0, 1, 2] };
    const loop: Action = { type: 'fold', loop: [0, 1, 2] };
    const reasons: [RejectReason, Action][] = [
      ...(['empty', 'tooShort', 'wrongParity', 'vertexOutOfRange'] as const).map(
        (code) => [{ code: 'invalidPath', error: { code } }, chain] as [RejectReason, Action],
      ),
      [{ code: 'invalidPath', error: { code: 'repeatedVertex', index: 2, vertex: 0 } }, chain],
      [{ code: 'invalidPath', error: { code: 'notAdjacent', index: 0 } }, chain],
      [{ code: 'invalidPath', error: { code: 'vertexOutOfRange', index: 1, vertex: 99 } }, chain],
      [{ code: 'notAFlower', error: { code: 'tooShort' } }, loop],
      [{ code: 'notAFlower', error: { code: 'vertexOutOfRange', index: 0, vertex: 99 } }, loop],
      [{ code: 'notAFlower', error: { code: 'repeatedVertex', index: 2, vertex: 0 } }, loop],
      [{ code: 'notAFlower', error: { code: 'notAlternating', index: 1 } }, loop],
      [{ code: 'flowersFolded' }, chain],
      [{ code: 'vertexOutOfRange', vertex: 99 }, chain],
      [{ code: 'sunMeetsSun', u: 3, v: 4 }, chain],
      [{ code: 'notPlaced', vertex: 5 }, chain],
      [{ code: 'noSuchFlower', blossom: 3 }, chain],
    ];
    for (const [reason, action] of reasons) {
      const text = reasonText(reason, action, labels, t);
      expect(text).not.toMatch(/[{}⟨⟩]/);
    }
  });

  it('points into a stem being rotated too, and names unnamed sprouts by their number', () => {
    const stem: Action = { type: 'rotateStem', stem: [0, 1, 2, 3] };
    expect(say({ code: 'invalidPath', error: { code: 'wrongParity', edges: 3 } }, stem)).toBe(
      'Esa cadena dejaría a alguien con dos faroles.',
    );
    expect(reasonText({ code: 'alreadyLit', vertex: 12 }, stem, labels, t)).toBe(
      '12 ya tiene farol: un farol es para dos.',
    );
  });
});
