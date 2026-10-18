import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { assetEntry } from '../src/game/assets/keys';
import { CHAR_ADVANCE, toolbarRow } from '../src/game/picture/bottomRows';
import {
  badgeAt,
  buttonContent,
  iconRoom,
  SUN_ICON,
  TOOL_BADGES,
  TOOL_ICONS,
  type ButtonIcon,
} from '../src/game/picture/buttonIcon';
import { fontMetrics } from '../src/game/picture/pixelFont';
import { LAYOUT } from '../src/game/view/layout';
import { createTranslator } from '../src/services/i18n';
import type { ToolId } from '../src/game/input/tools';

// The moon of the tool of marks is a badge of 8 × 8 on the corner of its sun (plan 09, phase 2;
// appendix A, question 15): with the real words and the pixel font, it stays inside the button,
// clear of the label, and the button is as wide as it was, so the toolbar still fits.

const t = createTranslator(strings);

/** An icon as it is drawn: its picture's size times its scale. */
const drawn = (icon: ButtonIcon): { width: number; height: number } => {
  const { width, height } = assetEntry(icon.texture).image ?? { width: 0, height: 0 };
  return { width: width * icon.scale, height: height * icon.scale };
};

describe('the badges on the tools', () => {
  const tools = Object.keys(TOOL_BADGES) as ToolId[];

  it('only the tool of marks wears one, the moon beside its sun', () => {
    expect(tools).toEqual(['marks']);
    expect(TOOL_ICONS.marks).toEqual([SUN_ICON]);
  });

  it.each(tools)('the badge of %s stays inside its button and off its label', (tool) => {
    const badge = TOOL_BADGES[tool];
    const icons = TOOL_ICONS[tool] ?? [];
    expect(badge).toBeDefined();
    if (badge === undefined) return;
    const height = fontMetrics(8).fontSize + 2;
    const label = [...t(`tool.${tool}`)].length * CHAR_ADVANCE;
    const [left = 0] = toolbarRow([iconRoom(icons) + label + 4]);
    const y = LAYOUT.toolbarY;
    const content = buttonContent(left, y, height, icons.map(drawn));
    const [first] = content.icons;
    expect(first).toBeDefined();
    if (first === undefined) return;
    const box = badgeAt(first, drawn(badge).width);
    // Inside the wood, which runs from a pixel above the label's line.
    expect(box.x).toBeGreaterThanOrEqual(left);
    expect(box.y).toBeGreaterThanOrEqual(y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(y - 1 + height);
    // Clear of the letters, which start at the label's place.
    expect(box.x + box.width).toBeLessThan(content.labelX);
    expect(box.x + box.width).toBeLessThanOrEqual(left + iconRoom(icons) + label + 4);
  });

  it('takes no room: the button of marks is as wide as its sun and its name', () => {
    expect(iconRoom(TOOL_ICONS.marks ?? [])).toBe(iconRoom([SUN_ICON]));
  });
});
