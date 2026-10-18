import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import { AUDIO_CHANNELS, type AudioChannel, type Settings } from '@services/settings';
import { playUiSound } from '../audio/uiSound';
import { assetEntry } from '../assets/keys';
import {
  grabberCentre,
  grabberLeft,
  sliderFill,
  volumeAt,
  volumePercent,
  type SliderTrack,
} from '../picture/volumeSlider';
import { SETTINGS_PANEL, settingsCorner, settingsRows } from '../picture/settingsPanelLayout';
import { checkbox, GRABBER, SLIDER_FILL, sliderLook } from '../picture/woodControls';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { addFocusable } from './focusables';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';
import { coverWith } from './focusables';

/** What the panel's controls ask for; the scene changes the settings and calls `render`. */
export interface SettingsActions {
  readonly volume: (channel: AudioChannel, value: number) => void;
  /** A side arrow on a slider in focus: its volume a step down (-1) or up (1). */
  readonly nudge: (channel: AudioChannel, direction: -1 | 1) => void;
  readonly mute: () => void;
  /** Downloads the playtest log, for playtesters to send back (GDD §10). */
  readonly exportLog: () => void;
  /** Opens the credits screen over the scene. */
  readonly credits: () => void;
  /** Opens the card of the keys over the panel. */
  readonly keys: () => void;
}

/** The panel's size and the rows on it, in canvas pixels (`picture/settingsPanelLayout.ts`). */
const WIDTH = SETTINGS_PANEL.width;
const PAD = SETTINGS_PANEL.pad;
const ROW = SETTINGS_PANEL.row;
const TRACK = SETTINGS_PANEL.track;
/** The colour the panel's text is written in, the one that reads on its wood. */
const INK = PALETTE[SETTINGS_PANEL.frame.text];
/** Depths: the blocker over everything else, then the panel and what is on it. */
const BLOCKER_DEPTH = 400;
const PANEL_DEPTH = 410;

/** The knob's width, from its picture, and how far its centre is from its left edge. */
const GRABBER_WIDTH = assetEntry(GRABBER.idle).image?.width ?? 0;
const GRABBER_CENTRE = grabberCentre(GRABBER_WIDTH);
/** The narrowest fill that keeps both rounded ends. */
const FILL_ENDS = SLIDER_FILL.idle.slices.left + SLIDER_FILL.idle.slices.right;

/** One slider as drawn: its knob, the bar it fills, the percentage beside it, and its state. */
interface Slider {
  readonly knob: Phaser.GameObjects.Image;
  readonly fill: WoodFrame;
  readonly value: Phaser.GameObjects.Text;
  readonly track: SliderTrack;
  /** The track's line, which the knob and the bar are centred on. */
  readonly middle: number;
  /** Whether the pointer is over the slider, which lights up its knob and bar. */
  hovered: boolean;
}

/**
 * The settings panel, in the wooden frame of the other panels and written in its ink: a slider for
 * the music, one for the effects and one for the voices, each with its percentage, the mute box,
 * the button that exports the playtest log, "Créditos", "Teclas" and "Cerrar". A dim layer over the whole screen takes
 * every touch meant for what is below while the panel is open. The panel only draws and reports:
 * what a touch means for the settings is decided by `picture/volumeSlider.ts` and the scene. The
 * keyboard's focus reaches each slider (the side arrows move it a step) and the mute box.
 */
export class SettingsView {
  private parts: { destroy(): void }[] = [];
  private sliders: Slider[] = [];
  private box: Phaser.GameObjects.Image | null = null;
  /** The settings shown, so a slider lit or dimmed by the pointer is drawn again as they are. */
  private shown: Settings | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
    private readonly actions: SettingsActions,
  ) {}

  /** Whether the panel is showing. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /** Opens the panel showing `settings`, sounding its wood unless it was already open. */
  show(settings: Settings): void {
    const reopening = this.open;
    this.clear();
    const { scene, t } = this;
    if (!reopening) playUiSound(scene, 'sfx.panelOpen');
    const close = new Button(scene, 0, 0, t('settings.close'), () => this.close()).setDepth(
      PANEL_DEPTH + 4,
    );
    const rows = settingsRows(close.height);
    const { x, y } = settingsCorner(rows.height);
    const blocker = coverWith(
      scene.add
        .rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, PALETTE.fog, 0.5)
        .setOrigin(0, 0)
        .setDepth(BLOCKER_DEPTH)
        .setInteractive(),
    );
    const panel = new WoodFrame(
      scene,
      SETTINGS_PANEL.frame,
      { x, y, width: WIDTH, height: rows.height },
      PANEL_DEPTH,
    );
    panel.zone.setInteractive();
    const title = scene.add
      .text(x + PAD, y + rows.title, t('settings.title'), textStyle(10, INK))
      .setDepth(PANEL_DEPTH + 1);
    this.parts.push(blocker, panel, title);
    this.sliders = AUDIO_CHANNELS.map((channel, i) =>
      this.addSlider(channel, x, y + itemAt(rows.sliders, i)),
    );
    this.addMute(x + PAD, y + rows.mute);
    const exportLog = new Button(scene, 0, 0, t('settings.exportLog'), () =>
      this.actions.exportLog(),
    ).setDepth(PANEL_DEPTH + 4);
    const credits = new Button(scene, 0, 0, t('settings.credits'), () =>
      this.actions.credits(),
    ).setDepth(PANEL_DEPTH + 4);
    const keys = new Button(scene, 0, 0, t('settings.keys'), () => this.actions.keys()).setDepth(
      PANEL_DEPTH + 4,
    );
    exportLog.moveTo(x + Math.round((WIDTH - exportLog.width) / 2), y + rows.exportLog);
    credits.moveTo(x + Math.round((WIDTH - credits.width) / 2), y + rows.credits);
    keys.moveTo(x + Math.round((WIDTH - keys.width) / 2), y + rows.keys);
    close.moveTo(x + Math.round((WIDTH - close.width) / 2), y + rows.close);
    this.parts.push(exportLog, credits, keys, close);
    this.render(settings);
  }

  /** Shows `settings` on the open panel: each knob and its bar, each percentage, and the mute box. */
  render(settings: Settings): void {
    if (!this.open) return;
    this.shown = settings;
    AUDIO_CHANNELS.forEach((channel, i) =>
      this.drawSlider(itemAt(this.sliders, i), settings[channel]),
    );
    this.box?.setTexture(checkbox(settings.muted));
  }

  /** Takes the panel and its blocker away, sounding its wood if it was open. */
  close(): void {
    if (this.open) playUiSound(this.scene, 'sfx.panelClose');
    this.clear();
  }

  /** Takes the panel and its blocker away, silently. */
  private clear(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    this.sliders = [];
    this.box = null;
    this.shown = null;
  }

  /** Draws a slider at `volume`: its knob and its bar in the look the pointer and the mute ask for. */
  private drawSlider(slider: Slider, volume: number): void {
    const muted = this.shown?.muted ?? false;
    const look = sliderLook(muted, slider.hovered);
    slider.knob.setTexture(look.grabber).setX(grabberLeft(volume, slider.track, GRABBER_WIDTH));
    const fill = sliderFill(volume, slider.track, slider.middle, FILL_ENDS);
    slider.fill.setVisible(fill !== null);
    if (fill !== null) slider.fill.setPiece(look.fill).setRect(fill);
    slider.value.setText(this.t('settings.volume', { percent: volumePercent(volume) }));
  }

  /** The pointer came onto or left a slider: it is drawn again, lit or not. */
  private hover(channel: AudioChannel, hovered: boolean): void {
    const slider = this.sliders[AUDIO_CHANNELS.indexOf(channel)];
    if (slider === undefined || this.shown === null) return;
    slider.hovered = hovered;
    this.drawSlider(slider, this.shown[channel]);
  }

  /**
   * A channel's row: its name, its track with the wooden bar filled up to a wooden knob to touch or
   * drag, and its percentage.
   */
  private addSlider(channel: AudioChannel, x: number, y: number): Slider {
    const { scene } = this;
    const track = { x0: x + TRACK.from, x1: x + TRACK.to };
    const middle = y + 4;
    const label = scene.add
      .text(x + PAD, y, this.t(`settings.${channel}`), textStyle(8, INK))
      .setDepth(PANEL_DEPTH + 1);
    const line = scene.add
      .rectangle(track.x0, middle, track.x1 - track.x0, 1, PALETTE.panelEdge)
      .setOrigin(0, 0.5)
      .setDepth(PANEL_DEPTH + 1);
    const fill = new WoodFrame(
      scene,
      SLIDER_FILL.idle,
      { x: track.x0, y: middle, width: 0, height: 0 },
      PANEL_DEPTH + 2,
    );
    const hit = scene.add
      .zone((track.x0 + track.x1) / 2, middle, track.x1 - track.x0 + 8, ROW - 2)
      .setDepth(PANEL_DEPTH + 2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) =>
        this.actions.volume(channel, volumeAt(pointer.worldX, track)),
      )
      .on('pointerover', () => this.hover(channel, true))
      .on('pointerout', () => this.hover(channel, false));
    // The knob's picture is drawn from its top-left corner; a drag reports that corner, so the
    // volume asked for is the one under the knob's centre.
    const knob = scene.add
      .image(
        track.x0,
        Math.round(middle - (assetEntry(GRABBER.idle).image?.height ?? 0) / 2),
        GRABBER.idle,
      )
      .setOrigin(0, 0)
      .setDepth(PANEL_DEPTH + 3)
      .setInteractive({ useHandCursor: true, draggable: true })
      .on('drag', (_: Phaser.Input.Pointer, dragX: number) =>
        this.actions.volume(channel, volumeAt(dragX + GRABBER_CENTRE, track)),
      )
      .on('pointerover', () => this.hover(channel, true))
      .on('pointerout', () => this.hover(channel, false));
    const value = scene.add
      .text(track.x1 + SETTINGS_PANEL.valueGap, y, '', textStyle(8, INK))
      .setDepth(PANEL_DEPTH + 1);
    this.parts.push(label, line, fill, hit, knob, value);
    addFocusable(scene, {
      box: () => {
        const { x: left, y: top, width, height } = hit.getBounds();
        return { x: left, y: top, width, height };
      },
      depth: () => hit.depth,
      live: () => hit.active,
      // Enter on a slider has nothing to press: the arrows move it.
      press: () => undefined,
      adjust: (direction) => this.actions.nudge(channel, direction),
    });
    return { knob, fill, value, track, middle, hovered: false };
  }

  /**
   * The mute row: the pack's wooden box, ticked while everything is silent, and its label; both
   * toggle it. The box's picture has a pixel of air around it, so it starts a pixel left of the row.
   */
  private addMute(x: number, y: number): void {
    const { scene } = this;
    this.box = scene.add
      .image(x - 1, y - 3, checkbox(false))
      .setOrigin(0, 0)
      .setDepth(PANEL_DEPTH + 1);
    const label = scene.add
      .text(x + 17, y, this.t('settings.mute'), textStyle(8, INK))
      .setDepth(PANEL_DEPTH + 1);
    const hit = scene.add
      .zone(x - 2, y - 1, label.x + label.width - x + 4, 11)
      .setOrigin(0, 0)
      .setDepth(PANEL_DEPTH + 3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.actions.mute());
    this.parts.push(this.box, label, hit);
    addFocusable(scene, {
      box: () => ({ x: hit.x, y: hit.y, width: hit.width, height: hit.height }),
      depth: () => hit.depth,
      live: () => hit.active,
      press: () => this.actions.mute(),
    });
  }
}
