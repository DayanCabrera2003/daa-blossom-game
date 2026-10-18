import { emptySave, recordCompletion } from '@services/save';
import { describe, expect, it } from 'vitest';
import { EPILOGUE_LEVEL, epilogueReached } from './epilogue';

describe('the place of the epilogue in the game (GDD §7)', () => {
  it('comes after the last garden, the Council of the Oaks', () => {
    expect(EPILOGUE_LEVEL).toBe('7.5');
  });

  it('the hub offers it again once that garden is won, and never before', () => {
    expect(epilogueReached(emptySave(), false)).toBe(false);
    expect(epilogueReached(recordCompletion(emptySave(), '7.4', 3), false)).toBe(false);
    expect(epilogueReached(recordCompletion(emptySave(), '7.5', 1), false)).toBe(true);
  });

  it('teacher mode opens everything, the epilogue too', () => {
    expect(epilogueReached(emptySave(), true)).toBe(true);
  });
});
