import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { invariant } from '@core/shared/invariant';
import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS } from './hints';
import { askHint, canAskHint, isHintAvailable, startSession, stepNow } from './levelSession';

/** A level of the catalog by its id. */
function levelOf(id: string): Level {
  const found = catalog().find((level) => level.data.id === id);
  invariant(found !== undefined, `the catalog has level ${id}`);
  return found;
}

describe('the hints a step of the script offers', () => {
  it('a question that brings no hints of its own offers no hint button (7.2 opens asking)', () => {
    const session = startSession(levelOf('7.2'), 0);
    expect(stepNow(session)?.step).toBe('ask');
    expect(canAskHint(session)).toBe(false);
    expect(isHintAvailable(session, 10 * HINT_DELAY_MS)).toBe(false);
    // The hint written for playing («pulsa Presentar») is never said under the question.
    expect(askHint(session, HINT_DELAY_MS)).toBeNull();
  });
});
