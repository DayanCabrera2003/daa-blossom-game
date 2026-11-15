import { describe, expect, it } from 'vitest';
import { levelButtonLabel } from './levelButtonLabel';
import { labelStars } from './starIcon';

describe("the label of a level's button in the hub", () => {
  it('a locked level shows only its number, keeping the room of its stars but drawing none', () => {
    const label = levelButtonLabel('4.2', false, 3, 3);
    expect(label.text).toBe(`4.2 ${' '.repeat(labelStars(3).spaces)}`);
    expect(label.room.spaces).toBe(labelStars(3).spaces);
    expect(label.room.offsets).toEqual([]);
  });

  it('an open level not yet won shows only its number, its stars still to win', () => {
    const label = levelButtonLabel('1.3', true, 0, 2);
    expect(label.text.trimEnd()).toBe('1.3');
    expect(label.room.offsets).toEqual([]);
  });

  it('a won level draws its stars from the left of the room its level can fill', () => {
    const label = levelButtonLabel('7.5', true, 2, 3);
    expect(label.room.spaces).toBe(labelStars(3).spaces);
    expect(label.room.offsets).toEqual(labelStars(3).offsets.slice(0, 2));
  });

  it('is as wide whatever the stars won, open or locked', () => {
    for (const ceiling of [2, 3]) {
      const widths = [false, true].flatMap((open) =>
        Array.from(
          { length: ceiling + 1 },
          (_, stars) => levelButtonLabel('4.12', open, stars, ceiling).text.length,
        ),
      );
      expect(new Set(widths).size).toBe(1);
    }
  });

  it('never draws more stars than its level can give', () => {
    expect(levelButtonLabel('0.1', true, 3, 2).room.offsets).toHaveLength(2);
  });

  it('never writes anything but the number and blanks, open or locked', () => {
    for (const open of [false, true]) {
      for (const stars of [0, 1, 2, 3]) {
        expect(levelButtonLabel('4.12', open, stars, 3).text).toMatch(/^4\.12 *$/);
      }
    }
  });
});
