import { AUDIO_CHANNELS } from '@services/settings';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { WOOD_PANEL, type WoodPiece } from './wood';

/**
 * Where everything goes on the settings panel, in canvas pixels from the panel's top-left corner:
 * the title, a row for each audio channel's slider, the mute box, the motion setting's name and its
 * three buttons (plan 09, phase 6), the button that exports the
 * playtest log (GDD §10; it moved here from the hub's top line, plan 08 phase 5), "Créditos"
 * (plan 09, phase 3), "Teclas" (the card of the keys, plan 09, phase 4) and "Cerrar", the buttons
 * centred, all in the wooden frame of the other
 * panels (plan 09, phase 2), so its text is written in that frame's ink. Pure: the view draws what this says, and the tests check
 * that the rows never touch, stay on the frame's face and the panel stays on the canvas.
 */
export const SETTINGS_PANEL: {
  readonly width: number;
  readonly pad: number;
  readonly row: number;
  readonly track: { readonly from: number; readonly to: number };
  readonly valueGap: number;
  readonly gap: number;
  readonly frame: WoodPiece;
} = {
  width: 200,
  /** Clear space inside the panel's edges. */
  pad: 8,
  /** From one row of sliders (and the mute box) to the next. */
  row: 16,
  /** Where each slider's track runs, from the panel's left edge. */
  track: { from: 64, to: 150 },
  /** From the end of a slider's track to its percentage. */
  valueGap: 10,
  /** Between the buttons stacked at the bottom. */
  gap: 4,
  /** The wood the panel is drawn in. */
  frame: WOOD_PANEL,
};

/** The top of each row of the panel, from the panel's top, and the panel's height. */
export interface SettingsRows {
  readonly title: number;
  readonly sliders: readonly number[];
  readonly mute: number;
  /** The top of the motion setting's name. */
  readonly motion: number;
  /** The top of the labels of the motion's three buttons. */
  readonly motionChoices: number;
  /** The top of the export button's label (its wood starts a pixel higher). */
  readonly exportLog: number;
  /** The top of the label of "Créditos". */
  readonly credits: number;
  /** The top of the label of "Teclas". */
  readonly keys: number;
  /** The top of the label of "Cerrar". */
  readonly close: number;
  readonly height: number;
}

/**
 * The rows of the panel for buttons `buttonHeight` tall: under the title the sliders, the mute box
 * and the motion's name a row apart, the motion's buttons a row under its name, then the export
 * button two pixels further, "Créditos", "Teclas" and "Cerrar" under it, and the panel's pad under
 * that.
 */
export function settingsRows(buttonHeight: number): SettingsRows {
  const { pad, row, gap } = SETTINGS_PANEL;
  const first = pad + 18;
  const sliders = AUDIO_CHANNELS.map((_, i) => first + i * row);
  const mute = first + AUDIO_CHANNELS.length * row;
  const motion = mute + row;
  const motionChoices = motion + row;
  const exportLog = motionChoices + buttonHeight + gap + 2;
  const credits = exportLog + buttonHeight + gap;
  const keys = credits + buttonHeight + gap;
  const close = keys + buttonHeight + gap;
  // A button's wood starts a pixel above its label and ends a pixel above the label's line.
  return {
    title: pad - 2,
    sliders,
    mute,
    motion,
    motionChoices,
    exportLog,
    credits,
    keys,
    close,
    height: close + buttonHeight - 2 + pad,
  };
}

/** The panel's top-left corner, centred on the canvas, for a panel `height` tall. */
export const settingsCorner = (height: number): { readonly x: number; readonly y: number } => ({
  x: (CANVAS_WIDTH - SETTINGS_PANEL.width) / 2,
  y: (CANVAS_HEIGHT - height) / 2,
});

/**
 * The left edge of each of the motion setting's buttons, from the panel's left edge, for buttons
 * `widths` wide: side by side a gap apart, centred across the panel.
 */
export function motionChoicesAt(widths: readonly number[]): number[] {
  const { width, gap } = SETTINGS_PANEL;
  const total = widths.reduce((sum, one) => sum + one, 0) + gap * Math.max(0, widths.length - 1);
  let x = Math.round((width - total) / 2);
  return widths.map((one) => {
    const left = x;
    x += one + gap;
    return left;
  });
}
