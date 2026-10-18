import type Phaser from 'phaser';

/**
 * Moving the parts of a panel together when the player drags it (the post-release fix of plan 09):
 * the wood, the buttons and the demos move themselves; a text or a picture moves by its position.
 */

/** A part that knows how to move itself (the wood of a panel, a button, a card's demo). */
export interface Shifting {
  shift(dx: number, dy: number): unknown;
}

/** A part of a panel: one that moves itself, or a plain object of the scene with a position. */
export type PanelPart = Shifting | Phaser.GameObjects.Components.Transform;

/** Moves every part in `parts` by (dx, dy). */
export function shiftParts(parts: readonly PanelPart[], dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  for (const part of parts) {
    if ('shift' in part) part.shift(dx, dy);
    else part.setPosition(part.x + dx, part.y + dy);
  }
}
