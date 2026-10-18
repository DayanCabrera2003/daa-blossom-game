import type Phaser from 'phaser';
import { reducesMotion } from '@services/motion';
import { contextOf } from './context';

/** Whether the system asks for less motion on screen, as the browser says now. */
export const systemAsksLessMotion = (): boolean =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Whether `scene` should move less now (plan 09, phase 6): the player's motion setting, which
 * starts by following the system's preference (`services/motion.ts`). Asked at the moment of
 * moving, so a change in the settings panel or in the system counts at once.
 */
export const movesLess = (scene: Phaser.Scene): boolean =>
  reducesMotion(contextOf(scene).settings.motion, systemAsksLessMotion());
