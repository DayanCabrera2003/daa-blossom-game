import { describe, expect, it } from 'vitest';
import { escapeAction } from './escape';

describe('what Escape does in a level', () => {
  it('leaves the level when nothing is open', () => {
    expect(escapeAction({ settingsOpen: false, insideLayer: false })).toBe('leave');
  });

  it('leaves the flower entered with the layers before the level', () => {
    expect(escapeAction({ settingsOpen: false, insideLayer: true })).toBe('leaveLayer');
  });

  it('closes the settings panel first, wherever the player is', () => {
    expect(escapeAction({ settingsOpen: true, insideLayer: false })).toBe('closeSettings');
    expect(escapeAction({ settingsOpen: true, insideLayer: true })).toBe('closeSettings');
  });
});
