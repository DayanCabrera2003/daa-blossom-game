import Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { codexSources, hasNewPages, openCodex } from '@services/codexProgress';
import { catalogEntries } from '@services/progress';
import { sandboxAccess } from '@services/sandboxAccess';
import type { SaveData } from '@services/save';
import { seeds } from '@services/seeds';
import { totalStars } from '@services/starCount';
import { assetEntry } from '../../assets/keys';
import type { Point } from '../../input/target';
import type { Rect } from '../../picture/boxDistance';
import { BOOK_ICON } from '../../picture/buttonIcon';
import { hubCounter } from '../../picture/hubCounter';
import { HUB } from '../../picture/hubLayout';
import { hubTopLine, type TopLine } from '../../picture/hubTopLine';
import { PIXEL_FONT } from '../../picture/pixelFont';
import { labelSeal, SEAL_PAD } from '../../picture/signSeal';
import { STAR_SIZE } from '../../picture/starIcon';
import { LINE_HEIGHT } from '../../picture/textWrap';
import { Button } from '../../view/Button';
import { GEAR_SIZE } from '../../view/GearButton';
import { css, PALETTE } from '../../view/palette';
import { drawStars } from '../../view/StarIcons';
import { textStyle } from '../../view/textStyle';
import { contextOf } from '../context';

/** The seed icon of the pack, drawn before the number of seeds. */
const SEED_ICON = 'icon.seed';

/** Above the signs' labels, which sit at depth 101: the Códex's "new" seal. */
const SEAL_DEPTH = 102;

/** What the top line leaves for the rest of the hub: the boxes it covers, and where the gear goes. */
export interface HubTopLineParts {
  readonly taken: readonly Rect[];
  readonly gear: Point;
}

/**
 * The hub's top line (plan 08, phase 5): the hub's title, the teacher badge in teacher mode, the
 * counter of the game's stars and of the seeds, and before the gear the Códex (once a page of it
 * is open), the Cuaderno (once a statement is written) and the free mode (once chapter 1 is
 * finished; in teacher mode, all three). Where each goes
 * is `picture/hubTopLine.ts`'s; reading the Códex over the hub takes its "new" seal away, and the
 * signs are laid out again.
 */
export function addHubTopLine(scene: Phaser.Scene): HubTopLineParts {
  const { catalog, t, saves, teacherMode, bus } = contextOf(scene);
  const save = saves.get();
  const heading = scene.add.text(0, 0, t('hub.title'), textStyle(12, PALETTE.lit));
  // In teacher mode the hub says so, after its title: every level, page and sign is open.
  const badge = teacherMode
    ? scene.add.text(0, 0, t('teacher.badge'), textStyle(8, PALETTE.sun))
    : null;
  const seedWidth = assetEntry(SEED_ICON).image?.width ?? 0;
  const counter = hubCounter(totalStars(catalogEntries(catalog), save), seeds(save), seedWidth);
  const count = scene.add.text(0, 0, counter.text, textStyle(8));

  // The signs, right to left from the gear: the Códex, the Cuaderno, then the free mode.
  const signs: Button[] = [];
  const codexOpen = openCodex(codexSources(catalog), save, teacherMode);
  const codex =
    codexOpen.size > 0
      ? new Button(scene, 0, 0, t('hub.codex'), () => bus.emit('book.open', { book: 'codex' }), [
          BOOK_ICON,
        ])
      : null;
  if (codex !== null) signs.push(codex);
  // The Cuaderno opens as a book over the hub, with a ribbon to the Códex.
  if (save.notebook.length > 0 || teacherMode) {
    signs.push(
      new Button(scene, 0, 0, t('hub.notebook'), () => bus.emit('book.open', { book: 'notebook' })),
    );
  }
  // The free mode, once chapter 1 is finished (in teacher mode, always): the game opens it.
  if (sandboxAccess(catalogEntries(catalog), save, teacherMode).exists) {
    signs.push(new Button(scene, 0, 0, t('hub.sandbox'), () => bus.emit('sandbox.open')));
  }

  /** The top line for the signs as wide as they are now. */
  const layout = (): TopLine =>
    hubTopLine({
      title: heading.width,
      badge: badge?.width ?? null,
      counter: counter.width,
      gear: GEAR_SIZE,
      signs: signs.map((sign) => sign.width),
      signHeight: signs[0]?.height ?? 0,
    });
  /** Moves each sign to where the top line now puts it; a sign's label is a pixel below its wood. */
  const placeSigns = (line: TopLine): void =>
    signs.forEach((sign, i) => {
      const at = itemAt(line.signs, i);
      sign.moveTo(at.x, at.y + 1);
    });

  // The Códex's "new" seal, written inside its sign after the word while some open page is still
  // unread, so it reads as part of the Códex and of no other sign. Reading the book over the hub
  // updates the save: the seal and its room go, and the signs to its left follow it.
  if (codex !== null) {
    const word = t('codex.new');
    const room = labelSeal(word);
    const seal = scene.add
      .text(0, HUB.topLineY, word, {
        ...textStyle(8, PALETTE.ink),
        backgroundColor: css(PALETTE.lit),
        padding: { x: SEAL_PAD },
      })
      .setDepth(SEAL_DEPTH);
    const showSeal = (now: SaveData): void => {
      const fresh = hasNewPages(codexOpen, now);
      codex.setLabel(fresh ? t('hub.codex') + ' '.repeat(room.spaces) : t('hub.codex'));
      const line = layout();
      placeSigns(line);
      // The blank cells end where the label does, 2 px inside the sign's right edge.
      const at = itemAt(line.signs, 0);
      seal.setX(at.x + at.width - 2 - room.spaces * PIXEL_FONT.advance + room.offset);
      seal.setVisible(fresh);
    };
    showSeal(save);
    const unsubscribe = saves.subscribe(showSeal);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  // Pages only get read while the hub is up, so the signs are now at their widest.
  const line = layout();
  placeSigns(line);
  heading.setPosition(line.title.x, line.title.y);
  if (badge !== null && line.badge !== null) badge.setPosition(line.badge.x, line.badge.y);
  const { x, y } = line.counter;
  count.setPosition(x, y);
  // The star and the seed in the blank cells the counter leaves for them.
  drawStars(
    scene,
    x + counter.star,
    y + Math.round((LINE_HEIGHT - STAR_SIZE) / 2),
    [{ x: 0, earned: true }],
    0,
  );
  // The seed only once there is one to count.
  if (counter.seed !== null && scene.textures.exists(SEED_ICON)) {
    const top = y + Math.round((LINE_HEIGHT - (assetEntry(SEED_ICON).image?.height ?? 0)) / 2);
    scene.add.image(x + counter.seed, top, SEED_ICON).setOrigin(0, 0);
  }
  const taken = [line.title, line.counter, line.gear, ...line.signs];
  if (line.badge !== null) taken.push(line.badge);
  return { taken, gear: { x: line.gear.x, y: line.gear.y } };
}
