import { AUDIO_CHANNELS } from '@services/settings';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Where everything goes on the settings panel, in canvas pixels from the panel's top-left corner:
 * the title, a row for each audio channel's slider, the mute box, the button that exports the
 * playtest log (GDD §10; it moved here from the hub's top line, plan 08 phase 5) and "Cerrar",
 * both buttons centred. Pure: the view draws what this says, and the tests check that the rows
 * never touch and the panel stays on the canvas.
 */
export const SETTINGS_PANEL = {
  width: 200,
  /** Clear space inside the panel's edges. */
  pad: 8,
  /** From one row of sliders (and the mute box) to the next. */
  row: 16,
  /** Where each slider's track runs, from the panel's left edge. */
  track: { from: 64, to: 150 },
  /** Between the two buttons stacked at the bottom. */
  gap: 4,
} as const;

/** The top of each row of the panel, from the panel's top, and the panel's height. */
export interface SettingsRows {
  readonly title: number;
  readonly sliders: readonly number[];
  readonly mute: number;
  /** The top of the export button's label (its wood starts a pixel higher). */
  readonly exportLog: number;
  /** The top of the label of "Cerrar". */
  readonly close: number;
  readonly height: number;
}

/**
 * The rows of the panel for buttons `buttonHeight` tall: under the title the sliders and the mute
 * box a row apart, then the export button two pixels further, "Cerrar" under it, and the panel's
 * pad under that.
 */
export function settingsRows(buttonHeight: number): SettingsRows {
  const { pad, row, gap } = SETTINGS_PANEL;
  const first = pad + 18;
  const sliders = AUDIO_CHANNELS.map((_, i) => first + i * row);
  const mute = first + AUDIO_CHANNELS.length * row;
  const exportLog = mute + row + 2;
  const close = exportLog + buttonHeight + gap;
  // A button's wood starts a pixel above its label and ends a pixel above the label's line.
  return {
    title: pad - 2,
    sliders,
    mute,
    exportLog,
    close,
    height: close + buttonHeight - 2 + pad,
  };
}

/** The panel's top-left corner, centred on the canvas, for a panel `height` tall. */
export const settingsCorner = (height: number): { readonly x: number; readonly y: number } => ({
  x: (CANVAS_WIDTH - SETTINGS_PANEL.width) / 2,
  y: (CANVAS_HEIGHT - height) / 2,
});
