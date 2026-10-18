import type { GardenState } from '@core/rules/state';
import type { TraceEvent } from '@core/trace/events';
import type { CodexTab } from '@levels/codex';
import type { ImportRejection } from '@levels/sandbox/importText';
import type { LevelData } from '@levels/schema';

/** The two books of the game: the Códex (GDD §5.6) and the Cuaderno (GDD §5.5). */
export type BookName = 'codex' | 'notebook';

/**
 * A request to open a book, optionally at one Códex entry ("C8") and one of its tabs (a link of the
 * Cuaderno opens the formal tab of the entry that translates its statement).
 */
export interface BookRequest {
  readonly book: BookName;
  readonly entry?: string;
  readonly tab?: CodexTab;
}

/** The interface sounds a book asks the game to play on its audio bus. */
export type BusSound = 'bookOpen' | 'bookFlip' | 'bookClose' | 'click';

/**
 * What the teacher's trace panel needs from the level being played (GDD §5.8): which level (its
 * whole garden, the names and places of its sprouts are the catalog's), every garden of the
 * player's day so far with the events that made each, and the one the sun shows now. The panel
 * writes the day from it, and runs Edmonds from the lanterns of the garden shown. A garden that is
 * not in the catalog (the free mode's) brings its own sprouts.
 */
export interface TeacherFeed {
  readonly level: string;
  /**
   * The sprouts of a garden the catalog does not have (names, places, bees and flowers), which the
   * panel cannot look up by `level`; absent for a level of the catalog. Its vines are in `day`.
   */
  readonly sprouts?: LevelData['sprouts'];
  /** The gardens of the day, dawn first: the history the sun walks. */
  readonly day: readonly GardenState[];
  /** Beside each garden of the day, the events the rules answered to its move (none at dawn). */
  readonly events: readonly (readonly TraceEvent[])[];
  /** The garden the sun shows now, an index into `day`. */
  readonly cursor: number;
}

/** What the game announces it can do, so the overlays only offer what exists. */
export interface Capabilities {
  /** Whether the free mode (sandbox) scene is registered. */
  readonly sandbox: boolean;
}

/**
 * A garden of the free mode offered to share (plan 08, phase 14), as the share sheet shows it. The
 * sheet builds the link from the code and the page's own address, so the game never reads it.
 */
export interface ShareRequest {
  /** The garden code (sprouts, vines and lanterns, without places nor names); null with no garden. */
  readonly code: string | null;
  /** The garden as a level file, written out with places and names; null when it makes none yet. */
  readonly json: string | null;
}

/** What the game made of a text opened in the share sheet: a garden, or why not. */
export type ImportAnswer =
  { readonly ok: true } | { readonly ok: false; readonly reason: ImportRejection };

/**
 * Every event between the game (`game/`) and the DOM overlays (`ui/`), with its payload. Neither
 * side imports the other: both import this map and share one bus, created in `main.ts`. Payloads
 * only use types of the core and of the level files, never anything of Phaser or of the DOM.
 */
export interface BusEvents {
  /** Open a book (the HUD book button, a hub sign, a notebook link to the Códex). */
  readonly 'book.open': BookRequest;
  /** A book or the epilogue opened or closed: while one is open the game takes no input. */
  readonly 'overlay.changed': { readonly open: boolean };
  /** An interface sound to play on the game's effects channel. */
  readonly sound: BusSound;
  /** Show the epilogue "Más allá del jardín" (GDD §7). */
  readonly 'epilogue.open': undefined;
  /** In teacher mode, the level's day after each move and each move of the sun, for the panel. */
  readonly 'teacher.feed': TeacherFeed;
  /** In teacher mode, the level was left: the panel has no garden to write until the next feed. */
  readonly 'teacher.leave': undefined;
  /** In teacher mode, open or fold the trace panel (the HUD's trace button, the T key). */
  readonly 'teacher.toggle': undefined;
  /** The trace panel opened or folded: the canvas makes room for it beside the garden, or takes it back. */
  readonly 'teacher.panel': { readonly open: boolean };
  /** A row of the panel's "Your day" was chosen: the game's sun moves to that step of the day. */
  readonly 'teacher.sun': { readonly step: number };
  /** What the game can do (today, whether the free mode exists). */
  readonly capabilities: Capabilities;
  /**
   * Start the free mode (the epilogue's button, offered only once `capabilities` says it exists);
   * the game listens to it once it registers that mode (plan 08).
   */
  readonly 'sandbox.open': undefined;
  /**
   * Open the credits over whatever scenes are up (the settings panel's and the epilogue's
   * "Créditos"); they come back as they were when the credits end.
   */
  readonly 'credits.open': undefined;
  /** Open the share sheet over the free mode's editor, with its garden (its "Compartir" button). */
  readonly 'sandbox.share': ShareRequest;
  /**
   * A code or a level file pasted or chosen in the share sheet, as it was written: the game reads
   * and checks it, and answers at once with `sandbox.importAnswer`.
   */
  readonly 'sandbox.imported': { readonly text: string };
  /** The game's answer to `sandbox.imported`: the sheet closes, or says kindly why not. */
  readonly 'sandbox.importAnswer': ImportAnswer;
}
