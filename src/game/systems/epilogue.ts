import type { SaveData } from '@services/save';

/**
 * The place of the epilogue "Más allá del jardín" in the game (GDD §7; plan 07, phase 11): it comes
 * after the last garden, the Council of the Oaks, whose win also opens the last entry of the Codex
 * that the epilogue leads to. Once that garden is won, a sign in the hub opens the epilogue again;
 * teacher mode opens everything, the epilogue too. Pure: the scenes ask here and draw.
 */

/** The level whose win leads to the epilogue instead of back to the hub. */
export const EPILOGUE_LEVEL = '7.5';

/** Whether the hub offers the epilogue: once its level is won, or always in teacher mode. */
export const epilogueReached = (save: SaveData, teacherMode: boolean): boolean =>
  teacherMode || save.levels[EPILOGUE_LEVEL] !== undefined;
