import { describe, expect, it } from 'vitest';
import { assetEntry } from '../assets/keys';
import { checkbox, GRABBER, grabberLook, SLIDER_FILL, sliderLook } from './woodControls';

describe('the wooden controls of the settings panel (plan 06, section 1.6)', () => {
  it('a knob rests, lights up under the pointer, and greys out while everything is muted', () => {
    expect(grabberLook(false, false)).toBe('idle');
    expect(grabberLook(false, true)).toBe('hover');
    expect(grabberLook(true, false)).toBe('muted');
    expect(grabberLook(true, true)).toBe('muted');
    expect(GRABBER).toEqual({
      idle: 'wood.sliderGrabber',
      hover: 'wood.sliderGrabberHover',
      muted: 'wood.sliderGrabberDisabled',
    });
  });

  it('the filled part of a slider lights up with its knob, but not while muted', () => {
    expect(sliderLook(false, false)).toEqual({ grabber: GRABBER.idle, fill: SLIDER_FILL.idle });
    expect(sliderLook(false, true)).toEqual({ grabber: GRABBER.hover, fill: SLIDER_FILL.hover });
    expect(sliderLook(true, true)).toEqual({ grabber: GRABBER.muted, fill: SLIDER_FILL.idle });
    expect(SLIDER_FILL.idle.texture).toBe('wood.sliderProgress');
    expect(SLIDER_FILL.hover.texture).toBe('wood.sliderProgressHover');
  });

  it('the fill keeps its rounded border inside its picture', () => {
    for (const piece of Object.values(SLIDER_FILL)) {
      const { width, height } = assetEntry(piece.texture).image ?? { width: 0, height: 0 };
      expect(piece.slices.left + piece.slices.right).toBeLessThan(width);
      expect(piece.slices.top + piece.slices.bottom).toBeLessThan(height);
    }
  });

  it('the mute box is ticked while everything is muted', () => {
    expect(checkbox(true)).toBe('wood.checked');
    expect(checkbox(false)).toBe('wood.unchecked');
  });
});
