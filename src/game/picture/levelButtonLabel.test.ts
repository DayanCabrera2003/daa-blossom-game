import { describe, expect, it } from 'vitest';
import { levelButtonLabel } from './levelButtonLabel';
import { labelStars } from './starIcon';

describe("the label of a level's button in the hub", () => {
  it('a locked level shows only its number, with no mark after it and no room for stars', () => {
    const label = levelButtonLabel('4.2', false, 3);
    expect(label.text).toBe('4.2');
    expect(label.room.spaces).toBe(0);
    expect(label.room.offsets).toEqual([]);
  });

  it('an open level not yet won shows only its number', () => {
    expect(levelButtonLabel('1.3', true, 0).text).toBe('1.3');
  });

  it('a won level leaves blank cells after its number where its stars are drawn', () => {
    const label = levelButtonLabel('7.5', true, 2);
    expect(label.room).toEqual(labelStars(2));
    expect(label.text).toBe(`7.5 ${' '.repeat(labelStars(2).spaces)}`);
  });

  it('never writes anything but the number and blanks, open or locked', () => {
    for (const open of [false, true]) {
      for (const stars of [0, 1, 2, 3, 4]) {
        expect(levelButtonLabel('4.12', open, stars).text).toMatch(/^4\.12 *$/);
      }
    }
  });
});
