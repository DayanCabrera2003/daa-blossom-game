import type { SaveData } from './save';

/** What the game knows as it starts: the address's requests and the player's progress. */
export interface StartRequest {
  /** A teacher's level to open straight away (`services/startLevel.ts`), or null. */
  readonly startLevel: string | null;
  /** A shared garden's code to open the free mode with (`services/startGarden.ts`), or null. */
  readonly startGarden: string | null;
  readonly teacherMode: boolean;
  readonly save: SaveData;
}

/** The screen the game opens on. */
export type StartScreen =
  | { readonly kind: 'level'; readonly levelId: string }
  | { readonly kind: 'garden'; readonly code: string }
  | { readonly kind: 'hub' }
  | { readonly kind: 'title' };

/**
 * The screen the game opens on (GDD §6): a teacher's level first, then a shared garden, both asked
 * by the address; with neither, the title for a player who has won no garden yet, and the hub for
 * everyone else. Teacher mode, which opens everything, always skips the title.
 */
export function startScreen(request: StartRequest): StartScreen {
  if (request.startLevel !== null) return { kind: 'level', levelId: request.startLevel };
  if (request.startGarden !== null) return { kind: 'garden', code: request.startGarden };
  const started = Object.keys(request.save.levels).length > 0;
  return started || request.teacherMode ? { kind: 'hub' } : { kind: 'title' };
}
