import { compareLevelIds } from './catalog';

/**
 * The level where each piece of the interface that is not an action appears, as `chapter.level`
 * (GDD §5.1). Actions unlock through the rules (`core/rules/permissions.ts`); these pieces only
 * change what the screen shows. Undo and redo are there from 0.1, so they are not listed.
 */
export const UI_UNLOCKED_AT = {
  /** The sun of the top bar, the slider over the day. */
  sun: '0.5',
  /** The layers: entering a folded flower to see the flowers nested inside it, and leaving. */
  layers: '5.2',
} as const;

/** A piece of the interface that unlocks by level. */
export type UiPiece = keyof typeof UI_UNLOCKED_AT;

/** Whether `piece` is shown in level `levelId`: from its unlock level on. */
export const isUiUnlocked = (piece: UiPiece, levelId: string): boolean =>
  compareLevelIds(levelId, UI_UNLOCKED_AT[piece]) >= 0;
