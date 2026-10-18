import { describe, expect, it } from 'vitest';
import type { Translate } from '@services/i18n';
import { refusalText } from './refusalText';

/** A translator that shows the key and its parameters, to see what was asked for. */
const t: Translate = (key, params = {}) => `${key} ${JSON.stringify(params)}`;
const names = ['A', 'B', 'C', 'D'];

describe('refusalText', () => {
  it('names the sprouts of a refused pair or of a single sprout', () => {
    expect(
      refusalText(
        { reason: { code: 'notAdjacent', u: 0, v: 3 }, action: { type: 'join', u: 0, v: 3 } },
        names,
        t,
      ),
    ).toBe('reason.notAdjacent {"u":"A","v":"D"}');
    expect(
      refusalText(
        {
          reason: { code: 'noLanternToPass', vertex: 2 },
          action: { type: 'passLantern', from: 1, to: 2 },
        },
        names,
        t,
      ),
    ).toBe('reason.noLanternToPass {"vertex":"C"}');
  });

  it('names the action still locked by its own text', () => {
    expect(
      refusalText(
        {
          reason: { code: 'actionLocked', action: 'chain' },
          action: { type: 'chain', path: [0, 1] },
        },
        names,
        t,
      ),
    ).toBe('reason.actionLocked {"action":"action.chain {}"}');
  });

  it('points at the sprouts where a chain goes wrong', () => {
    const chain = { type: 'chain', path: [0, 1, 2, 3] } as const;
    expect(
      refusalText(
        {
          reason: { code: 'invalidPath', error: { code: 'notAlternating', index: 1 } },
          action: chain,
        },
        names,
        t,
      ),
    ).toBe('reason.invalidPath.notAlternating {"u":"B","v":"C"}');
    expect(
      refusalText(
        {
          reason: { code: 'invalidPath', error: { code: 'endpointNotExposed', vertex: 3 } },
          action: chain,
        },
        names,
        t,
      ),
    ).toBe('reason.invalidPath.endpointNotExposed {"vertex":"D"}');
    expect(
      refusalText(
        {
          reason: { code: 'invalidPath', error: { code: 'wrongParity', edges: 2 } },
          action: chain,
        },
        names,
        t,
      ),
    ).toBe('reason.invalidPath.wrongParity {}');
  });

  it('says the rest by its code alone, and names an unknown sprout by its number', () => {
    expect(
      refusalText(
        { reason: { code: 'flowersFolded' }, action: { type: 'chain', path: [0, 1] } },
        names,
        t,
      ),
    ).toBe('reason.flowersFolded {}');
    expect(
      refusalText(
        { reason: { code: 'alreadyLit', vertex: 9 }, action: { type: 'join', u: 9, v: 0 } },
        names,
        t,
      ),
    ).toBe('reason.alreadyLit {"vertex":"9"}');
  });
});
