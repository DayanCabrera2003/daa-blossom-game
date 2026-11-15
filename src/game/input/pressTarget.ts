/**
 * Where a press on the level screen goes: to the garden, as a move; or, while the dialogue box is
 * open, to the box, which moves on as if touched while the garden under it stays untouched. A press
 * on a button or a panel is theirs, and one that grabbed a panel's frame is that panel's drag:
 * neither goes anywhere else. Pure.
 */

/** Who hears a press: the garden, the dialogue box, or nobody (something on screen took it). */
export type PressTarget = 'garden' | 'dialogue' | 'none';

/** What is known of a press as it lands. */
export interface PressAt {
  /** Whether a button, panel or other interactive piece lies under the pointer. */
  readonly covered: boolean;
  /** Whether the press grabbed a panel's frame, to drag it. */
  readonly grabbed: boolean;
  /** Whether the dialogue box is open. */
  readonly dialogueOpen: boolean;
}

/** Who hears the press `at`. */
export function pressTarget(at: PressAt): PressTarget {
  if (at.covered || at.grabbed) return 'none';
  return at.dialogueOpen ? 'dialogue' : 'garden';
}
