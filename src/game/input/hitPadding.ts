import type { Rect } from '../picture/boxDistance';

/**
 * Bigger touch zones for the buttons (plan 09, phase 7). On a phone the canvas's 14-pixel buttons
 * are small under a finger, so each button takes touches a little beyond its wood, into the free
 * space round it, without its drawing changing: up to `max` logical pixels on each side, never
 * more than half the gap to a neighbour (which takes the other half), never into a room kept for
 * other touches (the garden, whose sprouts and vines are pressed and dragged), and never off the
 * canvas or out of the panel that holds the button. Pure: the views ask for the zone at each touch
 * with the boxes of the screen as they are then.
 */
export const HIT_PADDING = {
  /** The most a zone grows past its button on each side, in logical pixels. */
  max: 4,
} as const;

/** What lies round a button: the other pressable things, what holds it, what is kept clear. */
export interface TouchRoom {
  /** The other pressable things of the screen (buttons, sliders, flowers). */
  readonly neighbours: readonly Rect[];
  /** What the zone stays inside: the canvas, or the panel holding the button. */
  readonly bounds: Rect;
  /** Rooms whose touches belong to something else, which the zone never reaches into. */
  readonly keepClear: readonly Rect[];
}

/** How far the zone may grow on each side. */
interface Pads {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Whether the spans [a0, a1) and [b0, b1) share some length. */
const spansMeet = (a0: number, a1: number, b0: number, b1: number): boolean => a0 < b1 && b0 < a1;

/** Whether two boxes share some area (touching edges do not). */
const overlap = (a: Rect, b: Rect): boolean =>
  spansMeet(a.x, a.x + a.width, b.x, b.x + b.width) &&
  spansMeet(a.y, a.y + a.height, b.y, b.y + b.height);

/**
 * Holds `pads` back from `other`: on each side of `box` that `other` lies beyond, while it lies
 * within `reach` of the box's span across that side, the zone grows at most `share` of the gap.
 * Grown zones only meet across a side if the other thing is that near across it: two buttons each
 * growing up to `max` need a reach of twice `max`, a fixed room a reach of `max`.
 */
function holdBack(pads: Pads, box: Rect, other: Rect, reach: number, share: number): void {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  const nearAcrossX = spansMeet(box.y - reach, bottom + reach, other.y, other.y + other.height);
  const nearAcrossY = spansMeet(box.x - reach, right + reach, other.x, other.x + other.width);
  if (nearAcrossX && other.x >= right) pads.right = Math.min(pads.right, (other.x - right) * share);
  if (nearAcrossX && other.x + other.width <= box.x)
    pads.left = Math.min(pads.left, (box.x - other.x - other.width) * share);
  if (nearAcrossY && other.y >= bottom)
    pads.bottom = Math.min(pads.bottom, (other.y - bottom) * share);
  if (nearAcrossY && other.y + other.height <= box.y)
    pads.top = Math.min(pads.top, (box.y - other.y - other.height) * share);
}

/**
 * The zone of `box` that takes touches, in `room`: the box grown into the free space round it. A
 * neighbour or a kept room that overlaps the box leaves it as it is.
 */
export function hitZone(box: Rect, room: TouchRoom, max: number = HIT_PADDING.max): Rect {
  if ([...room.neighbours, ...room.keepClear].some((other) => overlap(other, box))) return box;
  const { bounds } = room;
  const pads: Pads = {
    left: Math.max(0, Math.min(max, box.x - bounds.x)),
    right: Math.max(0, Math.min(max, bounds.x + bounds.width - box.x - box.width)),
    top: Math.max(0, Math.min(max, box.y - bounds.y)),
    bottom: Math.max(0, Math.min(max, bounds.y + bounds.height - box.y - box.height)),
  };
  for (const neighbour of room.neighbours) holdBack(pads, box, neighbour, 2 * max, 1 / 2);
  for (const kept of room.keepClear) holdBack(pads, box, kept, max, 1);
  return {
    x: box.x - pads.left,
    y: box.y - pads.top,
    width: box.width + pads.left + pads.right,
    height: box.height + pads.top + pads.bottom,
  };
}
