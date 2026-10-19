import Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import type { SecretFlower } from '@services/secretFlowers';
import { playUiSound } from '../../audio/uiSound';
import { flowerKey } from '../../input/flowerFocus';
import { keyAction, pressOf } from '../../input/keyBindings';
import type { Rect } from '../../picture/boxDistance';
import type { TextRef } from '../../picture/hud';
import { PIXEL_FONT } from '../../picture/pixelFont';
import {
  BUD_CUT,
  FLOWER_TIP,
  flowerTipAt,
  secretFlowerPicture,
  type FlowerPicture,
} from '../../picture/secretFlower';
import { wonFlowerPixels, WON_FLOWER_TONES } from '../../picture/wonFlower';
import { css, PALETTE } from '../../view/palette';
import { cutFrame } from '../../view/sheetCuts';
import { drawStars } from '../../view/StarIcons';
import { addFocusable, type Focusable } from '../../view/focusables';
import { OutlinedText } from '../../view/OutlinedText';
import { textStyle } from '../../view/textStyle';
import { contextOf } from '../context';
import type { FocusController } from '../focus/FocusController';
import { openLevel } from '../LevelGate';

/** The pack's animated flower: two frames side by side, the open flower sways between them. */
const BLOOM_SHEET = 'anim.flower';
/** How long each frame of the sway lasts, in milliseconds. */
const SWAY_MS = 450;
/** How long the glow behind an open flower takes to brighten or to fade, in milliseconds. */
const GLOW_MS = 900;
/** The glow's opacity at its faintest and at its brightest. */
const GLOW_ALPHA = { from: 0.15, to: 0.45 } as const;
/** From the top of a line of the pixel font to the top of its digits. */
const DIGIT_DROP = PIXEL_FONT.ascent - PIXEL_FONT.capHeight;
/** How long the reason a bud is shut stays up after a touch, in milliseconds. */
const TELL_MS = 4000;
/** Over the ground (depth 0); the ring around the flower in focus over it. */
const FLOWER_DEPTH = 1;
const RING_DEPTH = 2;
/** Over the hub's buttons (100 to 102), under the settings panel (400). */
const TIP_DEPTH = 150;

/** A flower on the hub: which level it is, its picture, and the box that takes its touch. */
interface ShownFlower {
  readonly id: string;
  readonly picture: FlowerPicture;
  readonly hit: Rect;
}

/** Where a chapter's flower goes: its column at the margin, and the signpost beside it. */
export interface FlowerPlace {
  readonly cell: Rect;
  readonly sign: Rect;
}

/** What the secret flowers need from the hub. */
export interface HubSecretsTarget {
  /** Whether something over the hub (the settings panel) should take the keys instead. */
  readonly blocked: () => boolean;
  /** The hub's keyboard focus, which the flowers are part of. */
  readonly focus: FocusController;
}

/**
 * The secret flowers beside the signposts of the hub (plan 08, phase 5): each chapter's flower,
 * drawn as `picture/secretFlower.ts` says, in the column at `places` of its chapter, beside its
 * signpost. A pointer on a flower rings it and shows its tip; a touch enters an open or won
 * flower, or says why a bud is still shut. The keyboard does the same: the flowers are in the hub's
 * focus order, between their signposts and their chapters' buttons, Enter or Space press the one in
 * focus, and F and Shift+F jump straight from flower to flower (`input/flowerFocus.ts`).
 */
export function addHubSecrets(
  scene: Phaser.Scene,
  flowers: readonly SecretFlower[],
  places: ReadonlyMap<string, FlowerPlace>,
  target: HubSecretsTarget,
): void {
  const { t } = contextOf(scene);
  const shown: ShownFlower[] = [];
  for (const flower of flowers) {
    const place = places.get(flower.chapter);
    if (place === undefined) continue;
    const picture = secretFlowerPicture(flower.state, place.cell, place.sign);
    if (picture.hit === null) continue;
    paint(scene, picture);
    shown.push({ id: flower.id, picture, hit: picture.hit });
  }
  if (shown.length === 0) return;

  const ring = scene.add.graphics().setDepth(RING_DEPTH).setVisible(false);
  const tip = scene.add
    .text(0, 0, '', {
      ...textStyle(8, PALETTE.label),
      backgroundColor: css(PALETTE.ink),
      padding: FLOWER_TIP.pad,
    })
    .setDepth(TIP_DEPTH)
    .setVisible(false);
  let tellTimer: Phaser.Time.TimerEvent | null = null;
  /** The flower the keyboard's focus is on, as an index into `shown`. */
  let focus: number | null = null;

  /** Rings flower `i` (unless the focus is on it) and shows `text` beside it; with null, hides both. */
  const show = (i: number | null, text: TextRef | null = null): void => {
    tellTimer?.remove();
    tellTimer = null;
    const flower = i === null ? undefined : shown[i];
    if (flower === undefined) {
      ring.setVisible(false);
      tip.setVisible(false);
      return;
    }
    const { hit } = flower;
    // The flower the keyboard is on wears the focus's ring instead of this one.
    ring
      .clear()
      .lineStyle(1, PALETTE.highlight)
      .strokeRect(hit.x - 0.5, hit.y - 0.5, hit.width + 1, hit.height + 1)
      .setVisible(i !== focus);
    const words = text ?? flower.picture.tip;
    if (words === null) return;
    tip.setText(t(words.key, words.params)).setVisible(true);
    const at = flowerTipAt(Math.ceil(tip.width), Math.ceil(tip.height));
    tip.setPosition(at.x, at.y);
  };

  /** Does what a touch or Enter on flower `i` asks: enter it, or say why it is still shut. */
  const press = (i: number): void => {
    const flower = shown[i];
    const action = flower?.picture.press;
    if (flower === undefined || action === undefined || action === null) return;
    playUiSound(scene, 'sfx.button');
    if (action.kind === 'play') {
      openLevel(scene, { levelId: flower.id });
      return;
    }
    show(i, action.text);
    tellTimer = scene.time.delayedCall(TELL_MS, () => show(focus));
  };

  shown.forEach(({ hit }, i) => {
    scene.add
      .zone(hit.x, hit.y, hit.width, hit.height)
      .setOrigin(0, 0)
      .setDepth(RING_DEPTH)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => show(i))
      .on('pointerout', () => show(focus))
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          press(i);
        },
      );
  });

  // Each flower is a stop of the hub's focus: in focus it is ringed and shows its tip.
  const items: Focusable[] = shown.map(({ hit }, i) => ({
    box: () => hit,
    depth: () => RING_DEPTH,
    live: () => true,
    press: () => press(i),
    focused: (on) => {
      if (on) focus = i;
      else if (focus === i) focus = null;
      show(focus);
    },
  }));
  for (const item of items) addFocusable(scene, item);

  // F and Shift+F, unless the settings panel is up: the next or previous flower takes the focus.
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    if (target.blocked()) return;
    const action = keyAction('hub', pressOf(event));
    if (action !== 'flowerNext' && action !== 'flowerPrevious') return;
    const at = items.findIndex((item) => item === target.focus.current);
    const after = flowerKey(
      action === 'flowerNext' ? 'next' : 'previous',
      at < 0 ? null : at,
      items.length,
    );
    if (after.focus !== null) target.focus.focusOn(itemAt(items, after.focus));
  });
}

/**
 * Draws the pieces of a flower, in order: the glow (pulsing), the bud's leaves, the open flower
 * (swaying) or the golden rosette of a won one, the star and its number.
 */
function paint(scene: Phaser.Scene, picture: FlowerPicture): void {
  for (const piece of picture.pieces) {
    if (piece.kind === 'glow') {
      const glow = scene.add
        .ellipse(
          piece.x + piece.width / 2,
          piece.y + piece.height / 2,
          piece.width,
          piece.height,
          PALETTE.litGlow,
        )
        .setAlpha(GLOW_ALPHA.from)
        .setDepth(FLOWER_DEPTH);
      scene.tweens.add({
        targets: glow,
        alpha: GLOW_ALPHA.to,
        duration: GLOW_MS,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else if (piece.kind === 'star') {
      drawStars(scene, piece.x, piece.y, [{ x: 0, earned: piece.earned }], FLOWER_DEPTH);
    } else if (piece.kind === 'count') {
      // On the hub's grass, outlined as the sprouts' names are (`picture/textContrast.ts`).
      new OutlinedText(scene, piece.x, piece.y - DIGIT_DROP, piece.text, textStyle(8)).setDepth(
        FLOWER_DEPTH,
      );
    } else if (piece.kind === 'bud') {
      const frame = cutFrame(scene.textures, BUD_CUT);
      if (frame === null) continue;
      scene.add
        .image(piece.x, piece.y, BUD_CUT.sheet, frame)
        .setOrigin(0, 0)
        .setDepth(FLOWER_DEPTH);
    } else if (piece.kind === 'won') {
      const g = scene.add.graphics().setDepth(FLOWER_DEPTH);
      for (const pixel of wonFlowerPixels())
        g.fillStyle(PALETTE[WON_FLOWER_TONES[pixel.tone]], 1).fillRect(
          piece.x + pixel.x,
          piece.y + pixel.y,
          1,
          1,
        );
    } else if (scene.textures.exists(BLOOM_SHEET)) {
      const bloom = scene.add
        .image(piece.x, piece.y, BLOOM_SHEET, 0)
        .setOrigin(0, 0)
        .setDepth(FLOWER_DEPTH);
      let frame = 0;
      scene.time.addEvent({
        delay: SWAY_MS,
        loop: true,
        callback: () => {
          frame = 1 - frame;
          bloom.setFrame(frame);
        },
      });
    }
  }
}
