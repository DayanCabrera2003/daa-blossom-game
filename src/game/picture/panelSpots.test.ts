import { describe, expect, it } from 'vitest';
import { dialogueBox } from './dialogueBox';
import { QUESTION_PANEL, TUTORIAL_PANEL } from './panelLayout';
import {
  CARD_ROOM,
  cardSpots,
  dialogueSpots,
  NARROW_QUESTION,
  notebookSpots,
  QUESTION_ROOM,
  questionSpots,
  spotsIn,
  toastSpots,
} from './panelSpots';
import type { Rect } from './boxDistance';
import { LAYOUT } from '../view/layout';

/** Whether `box` lies inside `room`. */
const inside = (box: Rect, room: Rect): boolean =>
  box.x >= room.x &&
  box.y >= room.y &&
  box.x + box.width <= room.x + room.width &&
  box.y + box.height <= room.y + room.height;

describe('the spots a panel may take', () => {
  const room = { x: 10, y: 20, width: 100, height: 50 };

  it('the corners and middles of the room first, then a grid, all inside the room', () => {
    const spots = spotsIn(room, 40, 20);
    expect(spots.slice(0, 3)).toEqual([
      { x: 40, y: 20, width: 40, height: 20 },
      { x: 10, y: 20, width: 40, height: 20 },
      { x: 70, y: 20, width: 40, height: 20 },
    ]);
    expect(spots[3]).toEqual({ x: 40, y: 50, width: 40, height: 20 });
    for (const spot of spots) expect(inside(spot, room)).toBe(true);
    // The grid reaches both far edges.
    expect(spots).toContainEqual({ x: 70, y: 50, width: 40, height: 20 });
  });

  it('a box larger than the room has no spot', () => {
    expect(spotsIn(room, 101, 10)).toEqual([]);
    expect(spotsIn(room, 10, 51)).toEqual([]);
  });

  it('a question opens where it always did first, then anywhere in its room, wide or narrow', () => {
    const spots = questionSpots((width) => (width === QUESTION_PANEL.width ? 60 : 72), 30);
    expect(spots[0]).toEqual({ ...QUESTION_PANEL, height: 60 });
    expect(spots.some((spot) => spot.width === NARROW_QUESTION && spot.height === 72)).toBe(true);
    for (const spot of spots) expect(inside(spot, QUESTION_ROOM)).toBe(true);
    // Its room ends above the dialogue box.
    expect(QUESTION_ROOM.y + QUESTION_ROOM.height).toBe(dialogueBox(false).box.y);
  });

  it('a question with an option too wide for the narrow panel stays wide', () => {
    const spots = questionSpots(() => 60, NARROW_QUESTION);
    expect(spots.every((spot) => spot.width === QUESTION_PANEL.width)).toBe(true);
  });

  it('the notebook and a card open where they always did first', () => {
    expect(notebookSpots(100)[0]).toEqual({ ...QUESTION_PANEL, height: 100 });
    const cards = cardSpots(150);
    expect(cards[0]).toEqual({ ...TUTORIAL_PANEL, height: 150 });
    for (const spot of cards) expect(inside(spot, CARD_ROOM)).toBe(true);
    expect(CARD_ROOM.y + CARD_ROOM.height).toBe(LAYOUT.toolbarY - 1);
  });

  it('the dialogue box sits at the bottom as always, or just under the top bar', () => {
    const [home, top] = dialogueSpots();
    expect(home).toEqual(dialogueBox(false).box);
    expect(top?.y).toBe(LAYOUT.garden.y + 1);
  });

  it('a toast keeps to the room above where it always ended', () => {
    const home = { x: 200, y: 220, width: 80, height: 20 };
    const spots = toastSpots(home);
    expect(spots[0]).toEqual(home);
    for (const spot of spots) {
      expect(spot.y + spot.height).toBeLessThanOrEqual(240);
      expect(spot.y).toBeGreaterThan(LAYOUT.garden.y);
    }
  });
});
