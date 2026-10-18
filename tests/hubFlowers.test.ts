import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { boxesOverlap, type Rect } from '../src/game/picture/boxDistance';
import { BOOK_ICON, iconRoom } from '../src/game/picture/buttonIcon';
import { chapterTitle } from '../src/game/picture/chapterTitle';
import { hubCounter } from '../src/game/picture/hubCounter';
import { HUB_SIGN, signBox } from '../src/game/picture/hubGarden';
import { HUB, layoutHub } from '../src/game/picture/hubLayout';
import { hubTopLine } from '../src/game/picture/hubTopLine';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import {
  BLOOM_SIZE,
  BUD_CUT,
  flowerTipAt,
  secretFlowerPicture,
} from '../src/game/picture/secretFlower';
import { labelSeal } from '../src/game/picture/signSeal';
import { labelStars, STAR_SIZE } from '../src/game/picture/starIcon';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { catalog } from '../src/levels/catalog';
import { createTranslator } from '../src/services/i18n';
import { catalogEntries, visibleLevels } from '../src/services/progress';
import type { SecretFlowerState } from '../src/services/secretFlowers';

// The secret flowers grow on the signposts of the hub as the scene lays it out with the real
// catalog and the real words (plan 08, phase 5): each flower has its signpost, draws inside it, and
// the signpost keeps clear of the top line, every title and every button, in both modes and with
// every level at three stars (the widest buttons).

const t = createTranslator(strings);
const entries = catalogEntries(catalog());
/** The width the pixel font gives a text. */
const text = (words: string): number => estimatedButtonWidth(words) - 4;

/** The hub's boxes and the signpost of each chapter, as `HubScene` lays them out. */
function hubOf(teacherMode: boolean): { boxes: Rect[]; signs: Map<string, Rect> } {
  const shown = visibleLevels(entries, teacherMode);
  const chapters = [...new Set(shown.map((level) => level.id.split('.')[0] ?? ''))];
  const widths = chapters.map((chapter) =>
    shown
      .filter((level) => level.id.startsWith(`${chapter}.`))
      .map(({ id }) => estimatedButtonWidth(`${id} ${' '.repeat(labelStars(3).spaces)}`)),
  );
  const titles = chapters.map((chapter) => {
    const title = chapterTitle(chapter);
    return text(t(title.key, title.params)) + HUB_SIGN.width + HUB_SIGN.gap;
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
  const signs = new Map<string, Rect>();
  layout.chapters.forEach(({ titleY, buttons }, c) => {
    const chapter = chapters[c] ?? '';
    signs.set(chapter, signBox(titleY, BUTTON_HEIGHT));
    boxes.push({
      x: HUB.margin + HUB_SIGN.width + HUB_SIGN.gap,
      y: titleY,
      width: (titles[c] ?? 0) - HUB_SIGN.width - HUB_SIGN.gap,
      height: BUTTON_HEIGHT - 2,
    });
    buttons.forEach(({ x, y }, b) =>
      boxes.push({ x, y: y - 1, width: widths[c]?.[b] ?? 0, height: BUTTON_HEIGHT }),
    );
  });
  return { boxes, signs };
}

const STATES: SecretFlowerState[] = [
  { kind: 'bud', need: 14, have: 11 },
  { kind: 'open' },
  { kind: 'won', stars: 3 },
];

/** The box a piece of a flower covers. */
const pieceBox = (piece: ReturnType<typeof secretFlowerPicture>['pieces'][number]): Rect =>
  piece.kind === 'bud'
    ? { x: piece.x, y: piece.y, width: BUD_CUT.width, height: BUD_CUT.height }
    : piece.kind === 'bloom'
      ? { x: piece.x, y: piece.y, ...BLOOM_SIZE }
      : { x: piece.x, y: piece.y, width: STAR_SIZE, height: STAR_SIZE };

const flowers = entries.filter((level) => level.secret !== undefined);

describe('the secret flowers on the signposts of the hub', () => {
  it('there are flowers to place', () => {
    expect(flowers.length).toBeGreaterThan(0);
  });

  it.each([false, true])(
    'every flower has its signpost, clear of all else (teacher: %s)',
    (teacher) => {
      const { boxes, signs } = hubOf(teacher);
      for (const flower of flowers) {
        const sign = signs.get(flower.id.split('.')[0] ?? '');
        expect(sign, flower.id).toBeDefined();
        if (sign === undefined) continue;
        for (const box of boxes) expect(boxesOverlap(sign, box, 1)).toBe(false);
        for (const state of STATES) {
          const picture = secretFlowerPicture(state, sign);
          expect(picture.hit).toEqual(sign);
          for (const piece of picture.pieces.map(pieceBox)) {
            expect(piece.x).toBeGreaterThanOrEqual(sign.x);
            expect(piece.y).toBeGreaterThanOrEqual(sign.y);
            expect(piece.x + piece.width).toBeLessThanOrEqual(sign.x + sign.width);
            expect(piece.y + piece.height).toBeLessThanOrEqual(sign.y + sign.height);
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
    for (const sign of signs.values()) {
      for (const words of said) {
        // The words and the padding of their dark patch.
        const width = text(words) + 6;
        const at = flowerTipAt(sign, width, BUTTON_HEIGHT);
        expect(at.x).toBeGreaterThanOrEqual(HUB.margin);
        expect(at.x + width).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
        expect(at.y + BUTTON_HEIGHT).toBeLessThanOrEqual(CANVAS_HEIGHT);
      }
    }
  });
});
