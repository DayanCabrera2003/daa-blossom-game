import { actionsUnlockedBy } from '@core/rules/permissions';
import { unwrap } from '@core/shared/result';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import type { Design } from '@levels/sandbox/design';
import { toPlayable } from '@levels/sandbox/toLevel';
import { catalogEntries } from '@services/progress';
import { sandboxAccess, type SandboxAccess } from '@services/sandboxAccess';
import { emptySave } from '@services/save';
import { describe, expect, it } from 'vitest';
import { act, openSession } from './levelSession';
import { HUD_BUTTONS } from '../picture/bottomRows';
import { levelScreen, trackFor } from './musicFor';
import { levelScreenOf, openedLevel, openingLevelId } from './levelScreenOf';

const LEVELS = catalog();

const levelById = (id: string): Level => {
  const level = LEVELS.find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** A triangle A–B–C with a tail C–D: an odd loop to fold, one lantern short of its best. */
const TRIANGLE: Design = {
  sprouts: [
    { label: 'A', x: 120, y: 100 },
    { label: 'B', x: 200, y: 100 },
    { label: 'C', x: 160, y: 160 },
    { label: 'D', x: 240, y: 180 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'A'],
    ['C', 'D'],
  ],
  lanterns: [['A', 'B']],
};

/** What the free mode offers a player whose furthest level won is 1.8. */
const AT_1_8: SandboxAccess = {
  exists: true,
  actions: actionsUnlockedBy('1.8'),
  gardener: false,
  scarecrows: false,
  stones: false,
  interfaceAt: '1.8',
};

/** The design as the editor hands it to the level, with the actions of 1.8. */
const played = unwrap(toPlayable(TRIANGLE, AT_1_8.actions));

describe('the screen of a level of the catalog', () => {
  it("is today's: its chapter's music and season, its own interface, back to the hub", () => {
    for (const id of ['0.1', '4.6', '6.4', '7.5']) {
      const level = levelById(id);
      expect(levelScreenOf(level, null), id).toEqual({
        music: levelScreen(level),
        season: id.split('.')[0],
        keepsProgress: true,
        logsPlaytest: true,
        back: 'hub',
        backLabel: 'hud.back',
        interfaceAt: id,
        ownGarden: false,
        showsStars: true,
        teacherJumps: true,
        hudButtons: HUD_BUTTONS,
        traceRow: 'tools',
      });
    }
  });
});

describe('the screen of a garden of the free mode', () => {
  it("plays the hub's music on the hub's grass, keeps nothing and logs nothing", () => {
    const screen = levelScreenOf(played, AT_1_8);
    expect(trackFor(screen.music)).toBe('music.hub');
    expect(screen.season).toBe('0');
    expect(screen.keepsProgress).toBe(false);
    expect(screen.logsPlaytest).toBe(false);
  });

  it('goes back to the editor, and its back button says so', () => {
    const screen = levelScreenOf(played, AT_1_8);
    expect(screen.back).toBe('editor');
    expect(screen.backLabel).toBe('sandbox.design');
  });

  it('shows the interface of the furthest level won, and brings its own sprouts to the panel', () => {
    const screen = levelScreenOf(played, AT_1_8);
    expect(screen.interfaceAt).toBe('1.8');
    expect(screen.ownGarden).toBe(true);
  });

  it('shows no stars when won, since nothing is earned there', () => {
    expect(levelScreenOf(played, AT_1_8).showsStars).toBe(false);
  });

  it("has no hint button (it gives no hints) nor the mirror's check, and the trace beside the book", () => {
    const screen = levelScreenOf(played, AT_1_8);
    expect(screen.hudButtons).toEqual(
      HUD_BUTTONS.filter((name) => name !== 'hint' && name !== 'checkMirror'),
    );
    // The tools' row ends with the free mode's orders instead.
    expect(screen.traceRow).toBe('buttons');
  });

  it("takes no teacher's jumps to the levels around it: it is no level of the catalog", () => {
    expect(levelScreenOf(played, AT_1_8).teacherJumps).toBe(false);
  });

  it('with the actions of 1.8 refuses folding, for the reason any level gives', () => {
    const session = openSession(played, 0).session;
    const outcome = act(session, { type: 'fold', loop: [0, 1, 2] }, 0).outcome;
    expect(outcome).toEqual({
      ok: false,
      reason: { code: 'actionLocked', action: 'fold' },
    });
  });
});

describe('what the level scene opens', () => {
  const access = (): SandboxAccess => sandboxAccess(catalogEntries(LEVELS), emptySave(), false);

  it('a level of the catalog by its id, with its screen', () => {
    const opened = openedLevel({ levelId: '1.3' }, LEVELS, access);
    expect(opened?.level).toBe(levelById('1.3'));
    expect(opened?.screen).toEqual(levelScreenOf(levelById('1.3'), null));
    expect(openingLevelId({ levelId: '1.3' })).toBe('1.3');
  });

  it('nothing for an id the catalog does not have', () => {
    expect(openedLevel({ levelId: '8.8' }, LEVELS, access)).toBeNull();
  });

  it('a garden of the free mode as the editor built it, with the access of the progress', () => {
    const opened = openedLevel({ sandbox: { level: played } }, LEVELS, access);
    expect(opened?.level).toBe(played);
    expect(opened?.screen).toEqual(levelScreenOf(played, access()));
    expect(openingLevelId({ sandbox: { level: played } })).toBe('9.1');
  });
});
