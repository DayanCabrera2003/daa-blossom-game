import type { Level } from '@levels/build';
import type { SandboxAccess } from '@services/sandboxAccess';
import type { FreeOrders } from './levelController';
import { HUD_BUTTONS, type HudButton } from '../picture/bottomRows';
import { chapterOfLevel } from '../picture/seasons';
import { levelScreen, type MusicScreen } from './musicFor';

/**
 * The screen a level is played on (plan 08, phase 12): everything about it that is not the level's
 * logic. A level of the catalog plays its chapter's music on its chapter's season, keeps the
 * progress and the playtest log, goes back to the hub and shows the interface it unlocks. A garden
 * of the free mode is a level too (the same controller, session and views), and differs only here:
 * the hub's music and grass, nothing kept and nothing logged, back to the editor with its design,
 * the interface of the furthest level won, and its own sprouts for the teacher's panel. Pure: the
 * level scene asks once, as it opens, and never asks again whether it plays the free mode.
 */

/**
 * What the level scene opens with: a level of the catalog by its id, or a garden of the free mode
 * that the editor (in its own chunk) has already built as a level, with the free mode's orders on
 * it (the mechanical gardener, the certificate), so the scene never loads the free mode's code.
 */
export type LevelSceneData =
  | { readonly levelId: string }
  | { readonly sandbox: { readonly level: Level; readonly orders: FreeOrders } };

/** Where leaving a level goes: the hub, or the free mode's editor with the design played. */
export type LevelExit = 'hub' | 'editor';

/** The screen of a level, as the level scene sets it up. */
export interface LevelScreen {
  /** The music screen: the level's chapter (its race variant), or the hub. */
  readonly music: MusicScreen;
  /** The chapter whose season the backdrop wears (`0` is the hub's). */
  readonly season: string;
  /** Whether a win, its bets and its notebook statement are saved in the progress. */
  readonly keepsProgress: boolean;
  /** Whether the playtest log records the level. */
  readonly logsPlaytest: boolean;
  /** Where the back button, Escape and the victory panel's way back lead. */
  readonly back: LevelExit;
  /** The text key of the back button. */
  readonly backLabel: string;
  /** The level whose pieces of the interface show (the sun, the layers, the Council's count). */
  readonly interfaceAt: string;
  /** Whether the teacher's panel is fed the garden's sprouts: the catalog does not have them. */
  readonly ownGarden: boolean;
  /**
   * Whether the victory panel shows the stars won; a garden of the free mode earns none, so its
   * panel says a line of its own instead.
   */
  readonly showsStars: boolean;
  /**
   * Whether PageUp and PageDown jump to the level before or after in the catalog (teacher mode); a
   * garden of the free mode is no level of the catalog, so they do nothing there.
   */
  readonly teacherJumps: boolean;
  /** The buttons of the HUD's bottom row, in `HUD_BUTTONS` order. */
  readonly hudButtons: readonly HudButton[];
  /**
   * The row of the teacher's trace button: the end of the tools' row, or in the free mode, whose
   * orders end that row, the bottom row beside the Códex.
   */
  readonly traceRow: 'tools' | 'buttons';
}

/**
 * The bottom row of a garden of the free mode: no hint (it gives none) and no check of the mirror
 * challenge (it has no script), which leaves room for its orders above.
 */
const FREE_BUTTONS = HUD_BUTTONS.filter((name) => name !== 'hint' && name !== 'checkMirror');

/** The chapter of the hub's season, worn by the free mode. */
const HUB_SEASON = '0';

/**
 * The screen of `level`: of the catalog when `sandbox` is null, or of the free mode with what it
 * offers the player (`services/sandboxAccess.ts`).
 */
export function levelScreenOf(level: Level, sandbox: SandboxAccess | null): LevelScreen {
  if (sandbox === null) {
    return {
      music: levelScreen(level),
      season: chapterOfLevel(level.data.id),
      keepsProgress: true,
      logsPlaytest: true,
      back: 'hub',
      backLabel: 'hud.back',
      interfaceAt: level.data.id,
      ownGarden: false,
      showsStars: true,
      teacherJumps: true,
      hudButtons: HUD_BUTTONS,
      traceRow: 'tools',
    };
  }
  return {
    music: { kind: 'hub' },
    season: HUB_SEASON,
    keepsProgress: false,
    logsPlaytest: false,
    back: 'editor',
    backLabel: 'sandbox.design',
    interfaceAt: sandbox.interfaceAt,
    ownGarden: true,
    showsStars: false,
    teacherJumps: false,
    hudButtons: FREE_BUTTONS,
    traceRow: 'buttons',
  };
}

/** The id of the level the scene opens, for what it loads before it starts. */
export const openingLevelId = (data: LevelSceneData): string =>
  'levelId' in data ? data.levelId : data.sandbox.level.data.id;

/**
 * The level the scene opens, its screen and the free mode's orders on it: a level of `catalog` by
 * its id (null when it has none such), with no orders; or the free mode's garden and orders as
 * handed over, on the screen `access` (what the free mode offers, asked only then) says.
 */
export function openedLevel(
  data: LevelSceneData,
  catalog: readonly Level[],
  access: () => SandboxAccess,
): {
  readonly level: Level;
  readonly screen: LevelScreen;
  readonly orders: FreeOrders | null;
} | null {
  if ('sandbox' in data) {
    const { level, orders } = data.sandbox;
    return { level, screen: levelScreenOf(level, access()), orders };
  }
  const level = catalog.find((candidate) => candidate.data.id === data.levelId);
  return level === undefined ? null : { level, screen: levelScreenOf(level, null), orders: null };
}
