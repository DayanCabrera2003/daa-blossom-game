import { describe, expect, it } from 'vitest';
import { pressTarget } from './pressTarget';

describe('who hears a press on the level screen', () => {
  it('the garden, when nothing lies over it and no dialogue is open', () => {
    expect(pressTarget({ covered: false, grabbed: false, dialogueOpen: false })).toBe('garden');
  });

  it('the dialogue box, wherever the press lands, while it is open', () => {
    expect(pressTarget({ covered: false, grabbed: false, dialogueOpen: true })).toBe('dialogue');
  });

  it('nobody else when a button or a panel took it', () => {
    expect(pressTarget({ covered: true, grabbed: false, dialogueOpen: true })).toBe('none');
    expect(pressTarget({ covered: true, grabbed: false, dialogueOpen: false })).toBe('none');
  });

  it('nobody else when it grabbed a panel to drag it', () => {
    expect(pressTarget({ covered: false, grabbed: true, dialogueOpen: true })).toBe('none');
  });
});
