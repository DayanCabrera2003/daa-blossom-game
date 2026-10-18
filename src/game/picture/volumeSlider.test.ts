import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  grabberCentre,
  grabberLeft,
  knobAt,
  sliderFill,
  volumeAt,
  volumePercent,
} from './volumeSlider';

const track = { x0: 100, x1: 200 };

describe('a volume slider of the settings panel', () => {
  it('the knob sits along the track as far as the volume goes', () => {
    expect(knobAt(0, track)).toBe(100);
    expect(knobAt(0.5, track)).toBe(150);
    expect(knobAt(1, track)).toBe(200);
  });

  it('a touch on the track gives the volume there, on its nearest tenth', () => {
    expect(volumeAt(100, track)).toBe(0);
    expect(volumeAt(133, track)).toBe(0.3);
    expect(volumeAt(200, track)).toBe(1);
  });

  it('a touch or a drag past either end stops at that end', () => {
    expect(volumeAt(40, track)).toBe(0);
    expect(volumeAt(260, track)).toBe(1);
  });

  it('touching where the knob is gives back the same volume', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (tenths) => {
        const volume = tenths / 10;
        expect(volumeAt(knobAt(volume, track), track)).toBe(volume);
      }),
    );
  });

  it('a volume is shown as a whole percentage', () => {
    expect(volumePercent(0.8)).toBe(80);
    expect(volumePercent(0.3)).toBe(30);
    expect(volumePercent(0)).toBe(0);
  });
});

describe('the wooden pieces of a volume slider', () => {
  it('the knob is centred on where the volume puts it, on a whole pixel', () => {
    expect(grabberLeft(0, track, 13)).toBe(94);
    expect(grabberLeft(0.5, track, 13)).toBe(144);
    expect(grabberLeft(1, track, 13)).toBe(194);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (tenths) => {
        expect(Number.isInteger(grabberLeft(tenths / 10, { x0: 64, x1: 150 }, 13))).toBe(true);
      }),
    );
  });

  it('a drag of the knob asks for the volume under its centre', () => {
    expect(volumeAt(grabberLeft(0.7, track, 13) + grabberCentre(13), track)).toBe(0.7);
  });

  it('the fill runs from the start of the track to under the knob, centred on the track', () => {
    expect(sliderFill(0.5, track, 40, 6)).toEqual({ x: 100, y: 37, width: 53, height: 7 });
    expect(sliderFill(1, track, 40, 6)).toEqual({ x: 100, y: 37, width: 103, height: 7 });
  });

  it('a fill too short to hold its two rounded ends is not drawn', () => {
    expect(sliderFill(0, track, 40, 6)).toBeNull();
    expect(sliderFill(0.1, track, 40, 6)).not.toBeNull();
  });
});
