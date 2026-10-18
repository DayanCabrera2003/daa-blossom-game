import type { Point } from '../input/target';

/**
 * Where the player left each kind of panel (the post-release fix of plan 09): a panel dragged and
 * dropped opens there again for the rest of the session, until a double touch on its frame sends it
 * back to where it places itself. Pure: the memory is a value, each change a new one.
 */

/** The kinds of panel a player can move, each remembered apart. */
export const PANEL_KINDS = ['question', 'notebook', 'card', 'recipe', 'dialogue', 'toast'] as const;

/** A kind of panel. */
export type PanelKind = (typeof PANEL_KINDS)[number];

/** The top-left corner each kind of panel was last dropped at, for the kinds moved so far. */
export type PanelMemory = Readonly<Partial<Record<PanelKind, Point>>>;

/** No panel moved yet. */
export const NO_PANELS_MOVED: PanelMemory = {};

/** The memory with the panels of `kind` dropped at `at`. */
export const rememberPanel = (memory: PanelMemory, kind: PanelKind, at: Point): PanelMemory => ({
  ...memory,
  [kind]: at,
});

/** The memory without the panels of `kind`, which then place themselves again. */
export const forgetPanel = (memory: PanelMemory, kind: PanelKind): PanelMemory =>
  Object.fromEntries(Object.entries(memory).filter(([moved]) => moved !== kind));

/** Where the panels of `kind` were last dropped, or null when the player never moved one. */
export const recallPanel = (memory: PanelMemory, kind: PanelKind): Point | null =>
  memory[kind] ?? null;
