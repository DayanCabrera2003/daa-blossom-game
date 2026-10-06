import { describe, expect, it } from 'vitest';
import { isUiUnlocked, UI_UNLOCKED_AT } from './uiUnlocks';

describe('the unlock of interface pieces that are not actions', () => {
  it('the sun appears at 0.5 (GDD §5.1)', () => {
    expect(UI_UNLOCKED_AT.sun).toBe('0.5');
  });

  it('levels 0.1 to 0.4 hide the sun; 0.5 and every later level show it', () => {
    for (const id of ['0.1', '0.2', '0.3', '0.4']) expect(isUiUnlocked('sun', id)).toBe(false);
    for (const id of ['0.5', '0.6', '1.1', '2.4', '4.10'])
      expect(isUiUnlocked('sun', id)).toBe(true);
  });
});
