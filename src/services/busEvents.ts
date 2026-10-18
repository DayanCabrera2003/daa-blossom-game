import type { GardenState } from '@core/rules/state';
import type { TraceEvent } from '@core/trace/events';
import type { CodexTab } from '@levels/codex';

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
 * writes the day from it, and runs Edmonds from the lanterns of the garden shown.
 */
export interface TeacherFeed {
  readonly level: string;
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
  /** What the game can do (today, whether the free mode exists). */
  readonly capabilities: Capabilities;
  /**
   * Start the free mode (the epilogue's button, offered only once `capabilities` says it exists);
   * the game listens to it once it registers that mode (plan 08).
   */
  readonly 'sandbox.open': undefined;
}
