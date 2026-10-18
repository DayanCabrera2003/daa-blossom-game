import { CANVAS_WIDTH } from '../scale/integerZoom';
import { boxesOverlap, type Rect } from './boxDistance';
import { HUB } from './hubLayout';
import { LINE_HEIGHT } from './textWrap';

/**
 * The hub's top line (plan 08, section 1.2): at the left the hub's title, the teacher badge when
 * teacher mode is on, and the counter of stars and seeds; at the right the settings' gear and,
 * right to left before it, the signs there are (the Códex, the Cuaderno, the free mode). Pure: the
 * scene measures its texts and signs and puts them where this says, and this says whether they
 * all keep clear of one another.
 */
export const TOP_LINE = {
  /** The top of the texts at the left: the title, the badge and the counter share its line. */
  textY: 6,
  /** The top of the gear's square. */
  gearY: 4,
  /** Between the title, the badge and the counter. */
  gap: 2 * HUB.margin,
} as const;

/** What the top line holds, measured by the scene. */
export interface TopLineParts {
  /** The width of the hub's title. */
  readonly title: number;
  /** The width of the teacher badge, or null outside teacher mode. */
  readonly badge: number | null;
  /** The width of the counter of stars and seeds. */
  readonly counter: number;
  /** The side of the gear's square. */
  readonly gear: number;
  /** The width of each sign, in the order they stand from the gear leftwards. */
  readonly signs: readonly number[];
  /** The height of a sign, a button of the hub. */
  readonly signHeight: number;
}

/** Where each part of the top line goes, and whether they all keep clear of one another. */
export interface TopLine {
  readonly title: Rect;
  readonly badge: Rect | null;
  readonly counter: Rect;
  readonly gear: Rect;
  /** Each sign's wood, in the order given; a sign's label starts a pixel lower. */
  readonly signs: readonly Rect[];
  /** Whether no two boxes touch and every sign starts inside the left margin. */
  readonly clear: boolean;
}

/** Lays the top line out from its measured parts. */
export function hubTopLine(parts: TopLineParts): TopLine {
  const text = (x: number, width: number): Rect => ({
    x,
    y: TOP_LINE.textY,
    width,
    height: LINE_HEIGHT,
  });
  const title = text(HUB.margin, parts.title);
  const badge =
    parts.badge === null ? null : text(title.x + title.width + TOP_LINE.gap, parts.badge);
  const before = badge ?? title;
  const counter = text(before.x + before.width + TOP_LINE.gap, parts.counter);
  const gear = {
    x: CANVAS_WIDTH - HUB.margin - parts.gear,
    y: TOP_LINE.gearY,
    width: parts.gear,
    height: parts.gear,
  };
  let right = gear.x;
  const signs = parts.signs.map((width): Rect => {
    right -= HUB.gap + width;
    return { x: right, y: HUB.topLineY - 1, width, height: parts.signHeight };
  });
  const boxes = [title, ...(badge === null ? [] : [badge]), counter, gear, ...signs];
  const touching = boxes.some((a, i) => boxes.slice(i + 1).some((b) => boxesOverlap(a, b, 1)));
  const outside = signs.some((sign) => sign.x < HUB.margin);
  return { title, badge, counter, gear, signs, clear: !touching && !outside };
}
