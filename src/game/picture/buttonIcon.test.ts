import { describe, expect, it } from 'vitest';
import { assetEntry } from '../assets/keys';
import { fontMetrics } from './pixelFont';
import {
  badgeAt,
  buttonContent,
  BOOK_ICON,
  ICON_GAP,
  iconRoom,
  MOON_BADGE,
  RACE_ICON,
  ROCK_ICON,
  SUN_ICON,
  TOOL_BADGES,
  TOOL_ICONS,
} from './buttonIcon';

describe('the icons on buttons (plan 06, section 1.6)', () => {
  it('the tool of marks shows the sun of the pack', () => {
    expect(TOOL_ICONS.marks).toEqual([SUN_ICON]);
    expect(SUN_ICON.texture).toBe('icon.sun');
  });

  it('the tool of stones shows the rock of the pack', () => {
    expect(TOOL_ICONS.stones).toEqual([ROCK_ICON]);
    expect(ROCK_ICON.texture).toBe('icon.rock');
  });

  it('the races show the hourglass of the pack, as it is', () => {
    expect(RACE_ICON).toEqual({ texture: 'icon.hourglass', scale: 1 });
  });

  it('the books show the book of the pack at half its size, a line of text', () => {
    expect(BOOK_ICON).toEqual({ texture: 'icon.book', scale: 0.5 });
  });

  it('each icon takes its drawn width and a gap before what follows; no icon takes nothing', () => {
    expect(iconRoom([SUN_ICON])).toBe(12 + ICON_GAP);
    expect(iconRoom([SUN_ICON, ROCK_ICON])).toBe(12 + ICON_GAP + 8 + ICON_GAP);
    expect(iconRoom([])).toBe(0);
  });

  it('every icon is a whole number of pixels and fits on a button a line of text tall', () => {
    for (const icon of [...Object.values(TOOL_ICONS).flat(), BOOK_ICON]) {
      const { width, height } = assetEntry(icon.texture).image ?? { width: 0, height: 0 };
      expect(Number.isInteger(width * icon.scale)).toBe(true);
      expect(height * icon.scale).toBeLessThanOrEqual(fontMetrics(8).fontSize);
    }
  });

  it('the tool of marks wears the moon of the pack as a badge of 8 × 8 pixels', () => {
    expect(TOOL_BADGES.marks).toBe(MOON_BADGE);
    expect(MOON_BADGE.texture).toBe('icon.moon');
    const { width, height } = assetEntry(MOON_BADGE.texture).image ?? { width: 0, height: 0 };
    expect(width * MOON_BADGE.scale).toBe(8);
    expect(height * MOON_BADGE.scale).toBe(8);
  });

  it('sets a badge on the bottom-right corner of its icon, a pixel past it, into the gap', () => {
    expect(badgeAt({ x: 10, y: 20, width: 12, height: 12 }, 8)).toEqual({
      x: 15,
      y: 25,
      width: 8,
      height: 8,
    });
  });
});

describe('the pieces inside a button', () => {
  it('centres each icon on the wood, two pixels in, with the label after the last gap', () => {
    const at = buttonContent(100, 50, 14, [
      { width: 12, height: 12 },
      { width: 8, height: 8 },
    ]);
    expect(at.icons).toEqual([
      { x: 102, y: 50, width: 12, height: 12 },
      { x: 102 + 12 + ICON_GAP, y: 52, width: 8, height: 8 },
    ]);
    expect(at.labelX).toBe(102 + 12 + ICON_GAP + 8 + ICON_GAP);
    expect(buttonContent(100, 50, 14, []).labelX).toBe(102);
  });
});
