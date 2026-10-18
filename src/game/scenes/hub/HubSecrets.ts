import Phaser from 'phaser';
import type { SecretFlower } from '@services/secretFlowers';
import { playUiSound } from '../../audio/uiSound';
import { flowerKey, type FlowerKey } from '../../input/flowerFocus';
import type { Rect } from '../../picture/boxDistance';
import type { TextRef } from '../../picture/hud';
import {
  BUD_CUT,
  flowerTipAt,
  secretFlowerPicture,
  type FlowerPicture,
} from '../../picture/secretFlower';
import { css, PALETTE } from '../../view/palette';
import { cutFrame } from '../../view/sheetCuts';
import { drawStars } from '../../view/StarIcons';
import { textStyle } from '../../view/textStyle';
import { contextOf } from '../context';

/** The pack's animated flower: two frames side by side, the open flower sways between them. */
const BLOOM_SHEET = 'anim.flower';
/** How long each frame of the sway lasts, in milliseconds. */
const SWAY_MS = 450;
/** How long the reason a bud is shut stays up after a touch, in milliseconds. */
const TELL_MS = 4000;
/** Over the signposts (depth 0); the ring around the flower in focus over it. */
const FLOWER_DEPTH = 1;
const RING_DEPTH = 2;
/** Over the hub's buttons (100 to 102), under the settings panel (400). */
const TIP_DEPTH = 150;
/** Clear space around the tip's words, inside its dark patch. */
const TIP_PAD = { x: 3, y: 1 };

/** A flower on the hub: which level it is, its picture, and the box of its signpost. */
interface ShownFlower {
  readonly id: string;
  readonly picture: FlowerPicture;
  readonly hit: Rect;
}

/** What the secret flowers need from the hub. */
export interface HubSecretsTarget {
  /** Whether something over the hub (the settings panel) should take the keys instead. */
  readonly blocked: () => boolean;
}

/**
 * The secret flowers on the signposts of the hub (plan 08, phase 5): each chapter's flower, drawn
 * as `picture/secretFlower.ts` says, on the signpost at `signs` of its chapter. A pointer on a
 * flower rings it and shows its tip; a touch enters an open or won flower, or says why a bud is
 * still shut. The keyboard does the same (`input/flowerFocus.ts`): F and Shift+F move the focus,
 * Enter or Space press, Escape leaves.
 */
export function addHubSecrets(
  scene: Phaser.Scene,
  flowers: readonly SecretFlower[],
  signs: ReadonlyMap<string, Rect>,
  target: HubSecretsTarget,
): void {
  const { t } = contextOf(scene);
  const shown: ShownFlower[] = [];
  for (const flower of flowers) {
    const sign = signs.get(flower.chapter);
    if (sign === undefined) continue;
    const picture = secretFlowerPicture(flower.state, sign);
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
      padding: TIP_PAD,
    })
    .setDepth(TIP_DEPTH)
    .setVisible(false);
  let tellTimer: Phaser.Time.TimerEvent | null = null;
  /** The flower the keyboard is on, as an index into `shown`. */
  let focus: number | null = null;

  /** Rings flower `i` and shows `text` beside its signpost; with null, hides both. */
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
    ring
      .clear()
      .lineStyle(1, PALETTE.highlight)
      .strokeRect(hit.x - 0.5, hit.y - 0.5, hit.width + 1, hit.height + 1)
      .setVisible(true);
    const words = text ?? flower.picture.tip;
    if (words === null) return;
    tip.setText(t(words.key, words.params)).setVisible(true);
    const at = flowerTipAt(hit, Math.ceil(tip.width), Math.ceil(tip.height));
    tip.setPosition(at.x, at.y);
  };

  /** Does what a touch or Enter on flower `i` asks: enter it, or say why it is still shut. */
  const press = (i: number): void => {
    const flower = shown[i];
    const action = flower?.picture.press;
    if (flower === undefined || action === undefined || action === null) return;
    playUiSound(scene, 'sfx.button');
    if (action.kind === 'play') {
      scene.scene.start('level', { levelId: flower.id });
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

  /** A key on the flowers, unless the settings panel is up. */
  const onKey = (key: FlowerKey): void => {
    if (target.blocked()) return;
    const after = flowerKey(key, focus, shown.length);
    focus = after.focus;
    if (after.press !== null) press(after.press);
    else show(focus);
  };
  const keys = scene.input.keyboard;
  keys?.on('keydown-F', (event: KeyboardEvent) => onKey(event.shiftKey ? 'previous' : 'next'));
  keys?.on('keydown-ENTER', () => onKey('press'));
  keys?.on('keydown-SPACE', () => onKey('press'));
  keys?.on('keydown-ESC', () => onKey('leave'));
}

/** Draws the pieces of a flower: the bud, the flower (swaying, or golden), the star. */
function paint(scene: Phaser.Scene, picture: FlowerPicture): void {
  for (const piece of picture.pieces) {
    if (piece.kind === 'star') {
      drawStars(scene, piece.x, piece.y, [{ x: 0, earned: true }], FLOWER_DEPTH);
    } else if (piece.kind === 'bud') {
      const frame = cutFrame(scene.textures, BUD_CUT);
      if (frame === null) continue;
      scene.add
        .image(piece.x, piece.y, BUD_CUT.sheet, frame)
        .setOrigin(0, 0)
        .setDepth(FLOWER_DEPTH);
    } else if (scene.textures.exists(BLOOM_SHEET)) {
      const bloom = scene.add
        .image(piece.x, piece.y, BLOOM_SHEET, 0)
        .setOrigin(0, 0)
        .setDepth(FLOWER_DEPTH);
      if (piece.golden) bloom.setTint(PALETTE.sun);
      if (piece.sways) {
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
}
