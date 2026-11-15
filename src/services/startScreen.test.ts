import { describe, expect, it } from 'vitest';
import { emptySave, recordCompletion, recordTutorialSeen } from './save';
import { startScreen } from './startScreen';

/** What the game knows as it starts, for a player with no link and no progress. */
const fresh = {
  startLevel: null,
  startGarden: null,
  teacherMode: false,
  save: emptySave(),
};

describe('the first screen of the game', () => {
  it('a player with no garden won sees the title', () => {
    expect(startScreen(fresh)).toEqual({ kind: 'title' });
  });

  it('a card seen or a page read is not progress: the title still comes first', () => {
    expect(startScreen({ ...fresh, save: recordTutorialSeen(emptySave(), 'lantern') })).toEqual({
      kind: 'title',
    });
  });

  it('a player with a garden won goes straight to the hub', () => {
    const save = recordCompletion(emptySave(), '0.1', 1);
    expect(startScreen({ ...fresh, save })).toEqual({ kind: 'hub' });
  });

  it("a teacher's level link opens that level, title or not", () => {
    expect(startScreen({ ...fresh, teacherMode: true, startLevel: '4.6' })).toEqual({
      kind: 'level',
      levelId: '4.6',
    });
  });

  it("a shared garden opens the free mode, but a teacher's level comes first", () => {
    expect(startScreen({ ...fresh, startGarden: 'abc' })).toEqual({
      kind: 'garden',
      code: 'abc',
    });
    expect(
      startScreen({ ...fresh, teacherMode: true, startLevel: '1.1', startGarden: 'abc' }),
    ).toEqual({ kind: 'level', levelId: '1.1' });
  });

  it('teacher mode with no level skips the title for the hub, where everything is open', () => {
    expect(startScreen({ ...fresh, teacherMode: true })).toEqual({ kind: 'hub' });
  });
});
