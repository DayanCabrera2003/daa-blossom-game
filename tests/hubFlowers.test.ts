import { describe, expect, it } from 'vitest';
import { boxesOverlap, type Rect } from '../src/game/picture/boxDistance';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { epilogueSignAt, HUB } from '../src/game/picture/hubLayout';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import { PIXEL_FONT } from '../src/game/picture/pixelFont';
import {
  BLOOM_SIZE,
  BUD_CUT,
  FLOWER_TIP,
  flowerTipAt,
  secretFlowerPicture,
  type FlowerPiece,
} from '../src/game/picture/secretFlower';
import { STAR_SIZE } from '../src/game/picture/starIcon';
import { LINE_HEIGHT } from '../src/game/picture/textWrap';
import { WON_FLOWER_SIZE } from '../src/game/picture/wonFlower';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { catalog } from '../src/levels/catalog';
import { starsCeiling } from '../src/levels/starsCeiling';
import type { SecretFlowerState } from '../src/services/secretFlowers';
import { entries, hubOf, t, text } from './support/hubBoxes';

// The secret flowers grow beside the signposts of the hub as the scene lays it out with the real
// catalog and the real words (plan 08, phase 5): each flower has its column and its signpost, draws
// inside the column, and both keep clear of the top line, every title and every button, in both
// modes and with every level at three stars (the widest buttons).

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
    case 'won':
      return { x: piece.x, y: piece.y, width: WON_FLOWER_SIZE, height: WON_FLOWER_SIZE };
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

  it.each([
    ['a player', false],
    ['a teacher', true],
  ])(
    'for %s, every tip, the reason a bud is shut included, covers no button, title or signpost',
    (_, teacherMode) => {
      // The hub at its fullest: every level's button at its widest (three stars), every sign of
      // the top line, and the way to the epilogue at the bottom; with fewer stars or signs the
      // hub only has less in the way.
      const { boxes, signs } = hubOf(teacherMode);
      const epilogueWidth = estimatedButtonWidth(t('epilogue.title'));
      const epilogueAt = epilogueSignAt(epilogueWidth, BUTTON_HEIGHT);
      const taken: Rect[] = [
        ...boxes,
        ...[...signs.values()].flatMap(({ cell, sign }) => [cell, sign]),
        { x: epilogueAt.x, y: epilogueAt.y - 1, width: epilogueWidth, height: BUTTON_HEIGHT },
      ];
      const said = flowers.flatMap((flower) =>
        statesOf(flower).flatMap((state) => {
          const place = signs.get(flower.id.split('.')[0] ?? '');
          if (place === undefined) return [];
          const picture = secretFlowerPicture(state, place.cell, place.sign);
          const press = picture.press?.kind === 'tell' ? [picture.press.text] : [];
          return [...(picture.tip === null ? [] : [picture.tip]), ...press].map((ref) => ({
            flower: flower.id,
            words: t(ref.key, ref.params),
          }));
        }),
      );
      expect(said.length).toBeGreaterThan(flowers.length);
      for (const { flower, words } of said) {
        // The words in their dark patch, as the scene writes them.
        const width = text(words) + 2 * FLOWER_TIP.pad.x;
        const height = LINE_HEIGHT + 2 * FLOWER_TIP.pad.y;
        const at = flowerTipAt(width, height);
        const tip = { ...at, width, height };
        expect(at.x, words).toBeGreaterThanOrEqual(HUB.margin);
        expect(at.x + width, words).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
        expect(at.y + height, words).toBeLessThanOrEqual(CANVAS_HEIGHT);
        // A pixel clear of each, so the patch never touches a button's wood.
        const covered = taken.filter((box) => boxesOverlap(tip, box, 1));
        expect(covered, `${flower}: ${words}`).toEqual([]);
      }
    },
  );
});
