import { describe, expect, it } from 'vitest';
import { itemAt } from '@core/shared/itemAt';
import { AUDIO_CHANNELS } from '@services/settings';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { BUTTON_HEIGHT } from './panelLayout';
import { SETTINGS_PANEL, settingsCorner, settingsRows } from './settingsPanelLayout';
import { LINE_HEIGHT } from './textWrap';

describe('the rows of the settings panel', () => {
  const rows = settingsRows(BUTTON_HEIGHT);

  it('has a slider row for each audio channel, a row apart, under the title', () => {
    expect(rows.sliders).toHaveLength(AUDIO_CHANNELS.length);
    rows.sliders.forEach((y, i) =>
      expect(y).toBe(itemAt(rows.sliders, 0) + i * SETTINGS_PANEL.row),
    );
    expect(itemAt(rows.sliders, 0) - rows.title).toBeGreaterThanOrEqual(LINE_HEIGHT);
  });

  it('stacks the mute box, the export button and "Cerrar" without touching', () => {
    const last = itemAt(rows.sliders, rows.sliders.length - 1);
    expect(rows.mute - last).toBe(SETTINGS_PANEL.row);
    // The mute line ends before the export button's wood starts, a pixel above its label.
    expect(rows.mute + LINE_HEIGHT).toBeLessThanOrEqual(rows.exportLog - 1);
    expect(rows.exportLog - 1 + BUTTON_HEIGHT).toBeLessThan(rows.close - 1);
    expect(rows.close - 1 + BUTTON_HEIGHT + SETTINGS_PANEL.pad - 1).toBe(rows.height);
  });

  it('is centred on the canvas and stays inside it', () => {
    const corner = settingsCorner(rows.height);
    expect(corner.x * 2 + SETTINGS_PANEL.width).toBe(CANVAS_WIDTH);
    expect(corner.y).toBeGreaterThan(0);
    expect(corner.y + rows.height).toBeLessThan(CANVAS_HEIGHT);
  });
});
