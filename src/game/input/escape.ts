/** What the Escape key does on the level screen. */
export type EscapeAction = 'closeSettings' | 'leaveLayer' | 'leave';

/** What is open on the level screen when Escape is pressed. */
export interface EscapeContext {
  /** Whether the settings panel is showing. */
  readonly settingsOpen: boolean;
  /** Whether a flower is entered with the layers (5.2). */
  readonly insideLayer: boolean;
}

/**
 * Escape closes the innermost thing open: the settings panel first (a player closing it should not
 * lose the level), then the flower entered with the layers, and only then the level itself.
 */
export function escapeAction({ settingsOpen, insideLayer }: EscapeContext): EscapeAction {
  if (settingsOpen) return 'closeSettings';
  return insideLayer ? 'leaveLayer' : 'leave';
}
