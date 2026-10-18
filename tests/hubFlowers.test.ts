import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { boxesOverlap, type Rect } from '../src/game/picture/boxDistance';
import { BOOK_ICON, iconRoom } from '../src/game/picture/buttonIcon';
import { chapterTitle } from '../src/game/picture/chapterTitle';
import { hubCounter } from '../src/game/picture/hubCounter';
import { flowerBox, HUB_HEAD, signBox } from '../src/game/picture/hubGarden';
import { HUB, layoutHub } from '../src/game/picture/hubLayout';
import { hubTopLine } from '../src/game/picture/hubTopLine';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import { PIXEL_FONT } from '../src/game/picture/pixelFont';
import {
  BLOOM_SIZE,
  BUD_CUT,
  flowerTipAt,
  secretFlowerPicture,
  type FlowerPiece,
} from '../src/game/picture/secretFlower';
import { labelSeal } from '../src/game/picture/signSeal';
import { labelStars, STAR_SIZE } from '../src/game/picture/starIcon';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { catalog } from '../src/levels/catalog';
import { starsCeiling } from '../src/levels/starsCeiling';
import { createTranslator } from '../src/services/i18n';
import { catalogEntries, visibleLevels } from '../src/services/progress';
import type { SecretFlowerState } from '../src/services/secretFlowers';

// The secret flowers grow beside the signposts of the hub as the scene lays it out with the real
// catalog and the real words (plan 08, phase 5): each flower has its column and its signpost, draws
// inside the column, and both keep clear of the top line, every title and every button, in both
// modes and with every level at three stars (the widest buttons).

const t = createTranslator(strings);
const entries = catalogEntries(catalog());
/** The width the pixel font gives a text. */
const text = (words: string): number => estimatedButtonWidth(words) - 4;

/** A chapter's flower column and signpost. */
interface Place {
  readonly cell: Rect;
  readonly sign: Rect;
}

/** The hub's boxes and each chapter's flower column and signpost, as `HubScene` lays them out. */
function hubOf(teacherMode: boolean): { boxes: Rect[]; signs: Map<string, Place> } {
  const shown = visibleLevels(entries, teacherMode);
  const chapters = [...new Set(shown.map((level) => level.id.split('.')[0] ?? ''))];
  const widths = chapters.map((chapter) =>
    shown
      .filter((level) => level.id.startsWith(`${chapter}.`))
      .map(({ id }) => estimatedButtonWidth(`${id} ${' '.repeat(labelStars(3).spaces)}`)),
  );
  const titles = chapters.map((chapter) => {
    const title = chapterTitle(chapter);
    return text(t(title.key, title.params)) + HUB_HEAD;
  });
  const layout = layoutHub(widths, BUTTON_HEIGHT, titles);
  const top = hubTopLine({
    title: text(t('hub.title')),
    badge: teacherMode ? text(t('teacher.badge')) : null,
    counter: hubCounter(999, 99, 8).width,
    gear: 13,
    signs: [
      estimatedButtonWidth(t('hub.codex') + ' '.repeat(labelSeal(t('codex.new')).spaces)) +
        iconRoom([BOOK_ICON]),
      estimatedButtonWidth(t('hub.notebook')),
    ],
    signHeight: BUTTON_HEIGHT,
  });
  const boxes: Rect[] = [top.title, top.counter, top.gear, ...top.signs];
  if (top.badge !== null) boxes.push(top.badge);
  const signs = new Map<string, Place>();
  layout.chapters.forEach(({ titleY, buttons }, c) => {
    const chapter = chapters[c] ?? '';
    signs.set(chapter, {
      cell: flowerBox(titleY, BUTTON_HEIGHT),
      sign: signBox(titleY, BUTTON_HEIGHT),
    });
    boxes.push({
      x: HUB.margin + HUB_HEAD,
      y: titleY,
      width: (titles[c] ?? 0) - HUB_HEAD,
      height: BUTTON_HEIGHT - 2,
    });
    buttons.forEach(({ x, y }, b) =>
      boxes.push({ x, y: y - 1, width: widths[c]?.[b] ?? 0, height: BUTTON_HEIGHT }),
    );
  });
  return { boxes, signs };
}

const flowers = entries.filter((level) => level.secret !== undefined);

/** The levels of `flower`'s chapter that are not secret flowers nor drafts. */
const chapterLevels = (flower: (typeof flowers)[number]) =>
  entries.filter(
    (level) =>
      level.id.split('.')[0] === flower.id.split('.')[0] &&
      level.secret === undefined &&
      level.draft !== true,
  );

/**
 * Every state `flower` can show at its widest: a bud with the most stars missing (the chapter
 * finished with one star a level), open, and won with the most stars it gives.
 */
function statesOf(flower: (typeof flowers)[number]): SecretFlowerState[] {
  const need = flower.secret?.stars ?? 0;
  const have = chapterLevels(flower).length;
  const level = catalog().find((one) => one.data.id === flower.id);
  const most = level === undefined ? 0 : starsCeiling(level.data);
  return [{ kind: 'bud', need, have }, { kind: 'open' }, { kind: 'won', stars: most }];
}

/** The box a piece of a flower covers. */
function pieceBox(piece: FlowerPiece): Rect {
  switch (piece.kind) {
    case 'bud':
      return { x: piece.x, y: piece.y, width: BUD_CUT.width, height: BUD_CUT.height };
    case 'bloom':
      return { x: piece.x, y: piece.y, ...BLOOM_SIZE };
    case 'glow':
      return piece;
    case 'star':
      return { x: piece.x, y: piece.y, width: STAR_SIZE, height: STAR_SIZE };
    case 'count':
      return {
        x: piece.x,
        y: piece.y,
        width: piece.text.length * PIXEL_FONT.advance,
        height: PIXEL_FONT.capHeight,
      };
  }
}

describe('the secret flowers beside the signposts of the hub', () => {
  it('there are flowers to place', () => {
    expect(flowers.length).toBeGreaterThan(0);
  });

  it.each([false, true])(
    'every flower has its column and signpost, clear of all else (teacher: %s)',
    (teacher) => {
      const { boxes, signs } = hubOf(teacher);
      for (const flower of flowers) {
        const place = signs.get(flower.id.split('.')[0] ?? '');
        expect(place, flower.id).toBeDefined();
        if (place === undefined) continue;
        const { cell, sign } = place;
        expect(boxesOverlap(cell, sign, 1), flower.id).toBe(false);
        for (const box of boxes) {
          expect(boxesOverlap(sign, box, 1)).toBe(false);
          expect(boxesOverlap(cell, box, 1)).toBe(false);
        }
        for (const state of statesOf(flower)) {
          const picture = secretFlowerPicture(state, cell, sign);
          expect(picture.hit).not.toBeNull();
          // Every piece, the number of stars of the widest bud included, stays in the column.
          for (const piece of picture.pieces.map(pieceBox)) {
            expect(piece.x, `${flower.id} ${state.kind}`).toBeGreaterThanOrEqual(cell.x);
            expect(piece.y).toBeGreaterThanOrEqual(cell.y);
            expect(piece.x + piece.width, `${flower.id} ${state.kind}`).toBeLessThanOrEqual(
              cell.x + cell.width,
            );
            expect(piece.y + piece.height).toBeLessThanOrEqual(cell.y + cell.height);
          }
        }
      }
    },
  );

  it('every tip, the reason a bud is shut included, stays on the canvas on one line', () => {
    const { signs } = hubOf(true);
    const said = [
      t('hub.secret.bud', { need: 19, have: 12 }),
      t('hub.secret.budTip', { missing: 12 }),
      t('hub.secret.openTip'),
      t('hub.secret.wonTip', { stars: 3 }),
    ];
    for (const { cell, sign } of signs.values()) {
      const hit = secretFlowerPicture({ kind: 'open' }, cell, sign).hit;
      if (hit === null) continue;
      for (const words of said) {
        // The words and the padding of their dark patch.
        const width = text(words) + 6;
        const at = flowerTipAt(hit, width, BUTTON_HEIGHT);
        expect(at.x).toBeGreaterThanOrEqual(HUB.margin);
        expect(at.x + width).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
        expect(at.y + BUTTON_HEIGHT).toBeLessThanOrEqual(CANVAS_HEIGHT);
      }
    }
  });
});
