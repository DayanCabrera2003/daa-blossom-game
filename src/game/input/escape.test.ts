import { describe, expect, it } from 'vitest';
import { escapeAction, type EscapeContext } from './escape';

const LEVEL: EscapeContext = { canLeave: true };

describe('what Escape does, the same on every screen', () => {
  it('leaves a screen when nothing is open on it', () => {
    expect(escapeAction(LEVEL)).toBe('leave');
  });

  it('on the hub, which has nowhere to go back to, only takes the focus away', () => {
    expect(escapeAction({ canLeave: false })).toBe('blur');
  });

  it('leaves the flower entered with the layers before the level', () => {
    expect(escapeAction({ ...LEVEL, insideLayer: true })).toBe('leaveLayer');
  });

  it('closes the settings panel first, wherever the player is', () => {
    expect(escapeAction({ ...LEVEL, settingsOpen: true })).toBe('closeSettings');
    expect(escapeAction({ ...LEVEL, settingsOpen: true, insideLayer: true })).toBe('closeSettings');
    expect(escapeAction({ canLeave: false, settingsOpen: true })).toBe('closeSettings');
  });

  it('closes the card of the keys before the settings panel it was opened from', () => {
    expect(escapeAction({ ...LEVEL, keysOpen: true, settingsOpen: true })).toBe('closeKeys');
  });

  it('moves the dialogue on, and keeps a question waiting, before ever leaving the level', () => {
    expect(escapeAction({ ...LEVEL, dialogueOpen: true })).toBe('advanceDialogue');
    expect(escapeAction({ ...LEVEL, questionOpen: true })).toBe('stay');
    // A question with the mentor's hint beside it: the line is read first.
    expect(escapeAction({ ...LEVEL, dialogueOpen: true, questionOpen: true })).toBe(
      'advanceDialogue',
    );
    // A card shown over a dialogue closes first.
    expect(escapeAction({ ...LEVEL, cardOpen: true, dialogueOpen: true })).toBe('closeCard');
  });

  it('closes the innermost thing open, in one order for every screen', () => {
    const everything: EscapeContext = {
      canLeave: true,
      keysOpen: true,
      settingsOpen: true,
      cardOpen: true,
      dialogueOpen: true,
      questionOpen: true,
      menuOpen: true,
      selecting: true,
      insideLayer: true,
    };
    const order = [
      ['keysOpen', 'closeKeys'],
      ['settingsOpen', 'closeSettings'],
      ['cardOpen', 'closeCard'],
      ['dialogueOpen', 'advanceDialogue'],
      ['questionOpen', 'stay'],
      ['menuOpen', 'closeMenu'],
      ['selecting', 'letGo'],
      ['insideLayer', 'leaveLayer'],
    ] as const;
    let context = everything;
    for (const [open, action] of order) {
      expect(escapeAction(context)).toBe(action);
      context = { ...context, [open]: false };
    }
    expect(escapeAction(context)).toBe('leave');
  });
});
