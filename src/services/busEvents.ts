import type { Graph } from '@core/graph/types';
import type { Matching } from '@core/matching/types';
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
 * What the teacher's trace panel needs from the level being played (GDD §5.8): the whole garden,
 * the names of its sprouts, the lanterns lit now and the events of the player's day so far.
 */
export interface TeacherFeed {
  readonly graph: Graph;
  readonly names: readonly string[];
  readonly matching: Matching;
  readonly events: readonly TraceEvent[];
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
  /** In teacher mode, the level's state after each move, for the trace panel. */
  readonly 'teacher.feed': TeacherFeed;
  /** What the game can do (today, whether the free mode exists). */
  readonly capabilities: Capabilities;
}
