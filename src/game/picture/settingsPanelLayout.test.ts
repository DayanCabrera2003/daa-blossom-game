import { describe, expect, it } from 'vitest';
import { itemAt } from '@core/shared/itemAt';
import { AUDIO_CHANNELS } from '@services/settings';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { BUTTON_HEIGHT } from './panelLayout';
import {
  motionChoicesAt,
  SETTINGS_PANEL,
  settingsCorner,
  settingsRows,
} from './settingsPanelLayout';
import { LINE_HEIGHT } from './textWrap';
import { WOOD_PANEL } from './wood';

describe('the three buttons of the motion setting', () => {
  it('stand side by side a gap apart, centred across the panel', () => {
    const lefts = motionChoicesAt([46, 52, 52]);
    expect(lefts).toHaveLength(3);
    expect(itemAt(lefts, 1)).toBe(itemAt(lefts, 0) + 46 + SETTINGS_PANEL.gap);
    expect(itemAt(lefts, 2)).toBe(itemAt(lefts, 1) + 52 + SETTINGS_PANEL.gap);
    const right = SETTINGS_PANEL.width - (itemAt(lefts, 2) + 52);
    expect(Math.abs(itemAt(lefts, 0) - right)).toBeLessThanOrEqual(1);
  });
});

describe('the rows of the settings panel', () => {
  const rows = settingsRows(BUTTON_HEIGHT);

  it('has a slider row for each audio channel, a row apart, under the title', () => {
    expect(rows.sliders).toHaveLength(AUDIO_CHANNELS.length);
    rows.sliders.forEach((y, i) =>
      expect(y).toBe(itemAt(rows.sliders, 0) + i * SETTINGS_PANEL.row),
    );
    expect(itemAt(rows.sliders, 0) - rows.title).toBeGreaterThanOrEqual(LINE_HEIGHT);
  });

  it('stacks the mute box, the export button, "Créditos", "Teclas" and "Cerrar" without touching', () => {
    const last = itemAt(rows.sliders, rows.sliders.length - 1);
    expect(rows.mute - last).toBe(SETTINGS_PANEL.row);
    // The motion's name a row under the mute box, its three buttons under it, and the export
    // button's wood after them, each a pixel above its label.
    expect(rows.motion - rows.mute).toBe(SETTINGS_PANEL.row);
    expect(rows.motion + LINE_HEIGHT).toBeLessThanOrEqual(rows.motionChoices - 1);
    expect(rows.motionChoices - 1 + BUTTON_HEIGHT).toBeLessThan(rows.exportLog - 1);
    expect(rows.exportLog - 1 + BUTTON_HEIGHT).toBeLessThan(rows.credits - 1);
    expect(rows.credits - 1 + BUTTON_HEIGHT).toBeLessThan(rows.keys - 1);
    expect(rows.keys - 1 + BUTTON_HEIGHT).toBeLessThan(rows.close - 1);
    expect(rows.credits - rows.exportLog).toBe(rows.keys - rows.credits);
    expect(rows.keys - rows.credits).toBe(rows.close - rows.keys);
    expect(rows.close - 1 + BUTTON_HEIGHT + SETTINGS_PANEL.pad - 1).toBe(rows.height);
  });

  it('is centred on the canvas and stays inside it', () => {
    const corner = settingsCorner(rows.height);
    expect(corner.x * 2 + SETTINGS_PANEL.width).toBe(CANVAS_WIDTH);
    expect(corner.y).toBeGreaterThan(0);
    expect(corner.y + rows.height).toBeLessThan(CANVAS_HEIGHT);
  });

  it('is framed in the wood of the other panels, its rows all on the face inside the frame', () => {
    expect(SETTINGS_PANEL.frame).toBe(WOOD_PANEL);
    const { slices } = SETTINGS_PANEL.frame;
    expect(SETTINGS_PANEL.pad).toBeGreaterThanOrEqual(Math.max(slices.left, slices.right));
    // The title's capitals start a few pixels below the top of its line.
    expect(rows.title + 3).toBeGreaterThanOrEqual(slices.top);
    expect(rows.height - (rows.close - 1 + BUTTON_HEIGHT)).toBeGreaterThanOrEqual(slices.bottom);
  });
});
