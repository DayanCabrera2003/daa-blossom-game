import type Phaser from 'phaser';
import type { SpokenLine } from '../systems/speaker';
import { lineAloud } from '../systems/aloud';
import { contextOf } from './context';

/**
 * What `scene` says to a screen reader (plan 09, phase 6): each text, whole, goes over the bus to
 * the page's live region (`ui/a11y/liveRegion.ts`). The views are given this function, as they
 * only draw and never reach the shared context themselves.
 */
export const sayAloud =
  (scene: Phaser.Scene) =>
  (text: string): void =>
    contextOf(scene).bus.emit('a11y.say', { text });

/** What `scene` says to a screen reader of a line of dialogue: who says it, and the whole line. */
export const sayLineAloud =
  (scene: Phaser.Scene) =>
  (line: SpokenLine): void =>
    sayAloud(scene)(lineAloud(contextOf(scene).t, line));
