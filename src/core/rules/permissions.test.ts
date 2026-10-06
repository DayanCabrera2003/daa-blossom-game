import { describe, expect, it } from 'vitest';
import { actionsUnlockedBy, UNLOCKED_AT } from './permissions';

describe('which actions a level has unlocked (GDD §5.1)', () => {
  it('the prologue only joins and splits', () => {
    expect(actionsUnlockedBy('0.1')).toEqual(['join', 'split']);
  });

  it('chains arrive in 1.3, after passing the lantern in 1.1', () => {
    expect(actionsUnlockedBy('1.3')).toEqual(['join', 'split', 'passLantern', 'chain']);
  });

  it('"Terminé" arrives in 1.8, when the goal starts hiding (§5.2)', () => {
    expect(actionsUnlockedBy('1.7')).not.toContain('declareDone');
    expect(actionsUnlockedBy('1.8')).toContain('declareDone');
  });

  it('levels compare as numbers: 4.10 comes after 4.9 and unlocks rotating the stem', () => {
    expect(actionsUnlockedBy('4.9')).not.toContain('rotateStem');
    expect(actionsUnlockedBy('4.10')).toContain('rotateStem');
  });

  it('by the Council, every action is at hand', () => {
    expect([...actionsUnlockedBy('7.5')].sort()).toEqual(Object.keys(UNLOCKED_AT).sort());
  });

  it('rejects ids that are not chapter.level', () => {
    expect(() => actionsUnlockedBy('four')).toThrow();
    expect(() => actionsUnlockedBy('4')).toThrow();
  });
});
