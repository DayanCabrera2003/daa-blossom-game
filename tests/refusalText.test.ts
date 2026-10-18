import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { reasonText } from '@game/picture/reasonText';
import type { Action } from '@core/rules/actions';
import type { RejectReason } from '@core/rules/reasons';
import { createTranslator } from '@services/i18n';
import { refusalText } from '@ui/model/refusalText';

/**
 * A refusal in a garden of the Codex reads exactly as the same refusal in the game (plan 07,
 * phase 4): every reason of the rules, every way a chain or a loop goes wrong, the same words.
 */

const t = createTranslator(strings);
const names = ['R', 'a', 'b', 'c', 'd'];
const chain: Action = { type: 'chain', path: [0, 1, 2, 3, 4] };
const loop: Action = { type: 'fold', loop: [1, 2, 3] };
const stem: Action = { type: 'rotateStem', stem: [0, 1, 2] };
const join: Action = { type: 'join', u: 0, v: 1 };

/** One refusal of each kind, with a move that could have caused it. */
const refusals: [RejectReason, Action][] = [
  [{ code: 'actionLocked', action: 'chain' }, chain],
  [{ code: 'vertexOutOfRange', vertex: 9 }, join],
  [{ code: 'notAdjacent', u: 0, v: 3 }, join],
  [{ code: 'alreadyLit', vertex: 1 }, join],
  [{ code: 'notLit', u: 0, v: 1 }, join],
  [{ code: 'notInTheDark', vertex: 1 }, join],
  [{ code: 'notARoot', vertex: 1 }, join],
  [{ code: 'noLanternToPass', vertex: 2 }, join],
  [{ code: 'flowersFolded' }, chain],
  [{ code: 'noFog' }, join],
  [{ code: 'alreadyInspected', vertex: 1 }, join],
  [{ code: 'vineHidden', vertex: 1 }, join],
  [{ code: 'notASun', vertex: 1 }, join],
  [{ code: 'litVine', u: 0, v: 1 }, join],
  [{ code: 'insideOneFlower', u: 0, v: 1 }, join],
  [{ code: 'alreadyMarked', vertex: 1 }, join],
  [{ code: 'sunMeetsSun', u: 0, v: 1 }, join],
  [{ code: 'notSunsOfOneTree', u: 0, v: 1 }, join],
  [{ code: 'searchInProgress' }, loop],
  [{ code: 'noSuchFlower', blossom: 3 }, join],
  [{ code: 'alreadyPlaced', vertex: 1 }, join],
  [{ code: 'notPlaced', vertex: 1 }, join],
  [{ code: 'invalidPath', error: { code: 'empty' } }, chain],
  [{ code: 'invalidPath', error: { code: 'vertexOutOfRange', index: 1, vertex: 9 } }, chain],
  [{ code: 'invalidPath', error: { code: 'repeatedVertex', index: 2, vertex: 0 } }, chain],
  [{ code: 'invalidPath', error: { code: 'notAdjacent', index: 1 } }, chain],
  [{ code: 'invalidPath', error: { code: 'notAlternating', index: 4 } }, chain],
  [{ code: 'invalidPath', error: { code: 'tooShort' } }, stem],
  [{ code: 'invalidPath', error: { code: 'endpointNotExposed', vertex: 4 } }, chain],
  [{ code: 'invalidPath', error: { code: 'wrongParity', edges: 3 } }, stem],
  [{ code: 'notAFlower', error: { code: 'tooShort' } }, loop],
  [{ code: 'notAFlower', error: { code: 'evenLength', length: 4 } }, loop],
  [{ code: 'notAFlower', error: { code: 'vertexOutOfRange', index: 0, vertex: 9 } }, loop],
  [{ code: 'notAFlower', error: { code: 'repeatedVertex', index: 2, vertex: 2 } }, loop],
  [{ code: 'notAFlower', error: { code: 'notAdjacent', index: 2 } }, loop],
  [{ code: 'notAFlower', error: { code: 'notAlternating', index: 1 } }, loop],
];

describe('the text of a refusal in a garden of the Codex', () => {
  it('is the game’s own text for every reason of the rules', () => {
    for (const [reason, action] of refusals) {
      expect(refusalText({ reason, action }, names, t)).toBe(reasonText(reason, action, names, t));
    }
  });

  it('covers every code of the rules', () => {
    const codes = new Set(refusals.map(([reason]) => reason.code));
    expect(codes.size).toBe(24);
  });
});
