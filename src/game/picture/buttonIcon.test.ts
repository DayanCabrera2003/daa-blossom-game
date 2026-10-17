import { describe, expect, it } from 'vitest';
import { assetEntry } from '../assets/keys';
import { fontMetrics } from './pixelFont';
import { ICON_GAP, iconRoom, SUN_ICON, TOOL_ICONS } from './buttonIcon';

describe('the icons on buttons (plan 06, section 1.6)', () => {
  it('the tool of marks shows the sun of the pack', () => {
    expect(TOOL_ICONS.marks).toBe(SUN_ICON);
    expect(SUN_ICON.texture).toBe('icon.sun');
  });

  it('an icon takes its drawn width and a gap before the label; no icon takes nothing', () => {
    expect(iconRoom(SUN_ICON)).toBe(12 + ICON_GAP);
    expect(iconRoom(null)).toBe(0);
  });

  it('every icon is a whole number of pixels and fits on a button a line of text tall', () => {
    for (const icon of Object.values(TOOL_ICONS)) {
      const { width, height } = assetEntry(icon.texture).image ?? { width: 0, height: 0 };
      expect(Number.isInteger(width * icon.scale)).toBe(true);
      expect(height * icon.scale).toBeLessThanOrEqual(fontMetrics(8).fontSize);
    }
  });
});
