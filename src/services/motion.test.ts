import { describe, expect, it } from 'vitest';
import { MOTION_CHOICES, reducesMotion } from './motion';

describe('whether the game moves less', () => {
  it('offers to follow the system, to move less and to move fully, the system first', () => {
    expect(MOTION_CHOICES).toEqual(['system', 'reduced', 'full']);
  });

  it('follows the system by default: less motion when the system asks for it', () => {
    expect(reducesMotion('system', true)).toBe(true);
    expect(reducesMotion('system', false)).toBe(false);
  });

  it('moves less when the player asks, whatever the system says', () => {
    expect(reducesMotion('reduced', false)).toBe(true);
    expect(reducesMotion('reduced', true)).toBe(true);
  });

  it('moves fully when the player asks, even if the system asks for less', () => {
    expect(reducesMotion('full', true)).toBe(false);
    expect(reducesMotion('full', false)).toBe(false);
  });
});
