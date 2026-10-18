import { describe, expect, it } from 'vitest';
import type { SecretFlowerState } from '@services/secretFlowers';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { frameRect } from '../assets/frames';
import { assetEntry } from '../assets/keys';
import type { Rect } from './boxDistance';
import { HUB } from './hubLayout';
import { PIXEL_FONT } from './pixelFont';
import {
  BLOOM_SIZE,
  BUD_CUT,
  flowerTipAt,
  secretFlowerPicture,
  type FlowerPiece,
} from './secretFlower';
import { STAR_SIZE } from './starIcon';
import { WON_FLOWER_SIZE } from './wonFlower';

/** A chapter's flower column and signpost, as `flowerBox` and `signBox` put them. */
const CELL: Rect = { x: HUB.margin, y: 39, width: 16, height: 16 };
const SIGN: Rect = { x: HUB.margin + 18, y: 39, width: 16, height: 16 };
/** The box of the flower's column and its signpost together. */
const BOTH: Rect = { x: CELL.x, y: CELL.y, width: SIGN.x + SIGN.width - CELL.x, height: 16 };

const STATES: SecretFlowerState[] = [
  { kind: 'none' },
  { kind: 'bud', need: 14, have: 11 },
  { kind: 'bud', need: 19, have: 10 },
  { kind: 'open' },
  { kind: 'won', stars: 2 },
  { kind: 'won', stars: 3 },
];

/** The box a piece covers on the canvas. */
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

/** The pieces of `state`'s picture of a kind. */
const piecesOf = (state: SecretFlowerState, kind: FlowerPiece['kind']): FlowerPiece[] =>
  secretFlowerPicture(state, CELL, SIGN).pieces.filter((piece) => piece.kind === kind);

describe('the secret flower beside its signpost', () => {
  it('shows nothing and takes no touch while its chapter is unfinished', () => {
    expect(secretFlowerPicture({ kind: 'none' }, CELL, SIGN)).toEqual({
      pieces: [],
      hit: null,
      tip: null,
      press: null,
    });
  });

  it('a bud is the two leaves of a sprout, with a dim star and the number of stars missing', () => {
    const state: SecretFlowerState = { kind: 'bud', need: 14, have: 11 };
    const bud = secretFlowerPicture(state, CELL, SIGN);
    expect(bud.pieces.map((piece) => piece.kind)).toEqual(['bud', 'star', 'count']);
    expect(piecesOf(state, 'star')).toEqual([expect.objectContaining({ earned: false })]);
    expect(piecesOf(state, 'count')).toEqual([expect.objectContaining({ text: '3' })]);
    expect(bud.tip).toEqual({ key: 'hub.secret.budTip', params: { missing: 3 } });
    expect(bud.press).toEqual({
      kind: 'tell',
      text: { key: 'hub.secret.bud', params: { need: 14, have: 11 } },
    });
  });

  it('an open flower glows and sways on the leaves of its bud, and is entered with a touch', () => {
    const open = secretFlowerPicture({ kind: 'open' }, CELL, SIGN);
    expect(open.pieces).toEqual([
      expect.objectContaining({ kind: 'glow' }),
      expect.objectContaining({ kind: 'bud' }),
      expect.objectContaining({ kind: 'bloom' }),
    ]);
    expect(open.tip).toEqual({ key: 'hub.secret.openTip', params: {} });
    expect(open.press).toEqual({ kind: 'play' });
  });

  it('a won flower is a golden rosette with the star, still, filling its column', () => {
    const state: SecretFlowerState = { kind: 'won', stars: 2 };
    const won = secretFlowerPicture(state, CELL, SIGN);
    expect(won.pieces).toEqual([
      { kind: 'won', x: CELL.x, y: CELL.y + Math.floor((CELL.height - WON_FLOWER_SIZE) / 2) },
    ]);
    // The stars it gave are told by its tip.
    expect(won.tip).toEqual({ key: 'hub.secret.wonTip', params: { stars: 2 } });
    expect(won.press).toEqual({ kind: 'play' });
  });

  it('a won flower reads bigger than an open one', () => {
    const height = (state: SecretFlowerState, kind: FlowerPiece['kind']): number =>
      Math.max(...piecesOf(state, kind).map((piece) => pieceBox(piece).height));
    expect(height({ kind: 'won', stars: 3 }, 'won')).toBeGreaterThan(
      height({ kind: 'open' }, 'bloom'),
    );
  });

  it('an open flower is as tall as its column, so it reads at least as big as a sprout', () => {
    const boxes = secretFlowerPicture({ kind: 'open' }, CELL, SIGN).pieces.map(pieceBox);
    const top = Math.min(...boxes.map((box) => box.y));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    expect(bottom - top).toBe(CELL.height);
  });

  it.each(STATES.filter((state) => state.kind !== 'none'))(
    'draws inside its column, the star never on the number, and is touched on the column and the signpost (%o)',
    (state) => {
      const picture = secretFlowerPicture(state, CELL, SIGN);
      expect(picture.hit).toEqual(BOTH);
      const boxes = picture.pieces.map(pieceBox);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(CELL.x);
        expect(box.y).toBeGreaterThanOrEqual(CELL.y);
        expect(box.x + box.width).toBeLessThanOrEqual(CELL.x + CELL.width);
        expect(box.y + box.height).toBeLessThanOrEqual(CELL.y + CELL.height);
      }
      const star = picture.pieces.find((piece) => piece.kind === 'star');
      const count = picture.pieces.find((piece) => piece.kind === 'count');
      if (star !== undefined && count !== undefined) {
        expect(pieceBox(star).x + STAR_SIZE).toBeLessThan(count.x);
        expect(count.y).toBe(star.y);
      }
    },
  );

  it("the open flower is a frame of the pack's animated flower", () => {
    expect(assetEntry('anim.flower').frame).toEqual(BLOOM_SIZE);
  });

  it("the bud is the leaves of the sprout's tile, without its empty rows", () => {
    const tile = frameRect('sproutLeaves');
    expect(BUD_CUT.sheet).toBe('tiles.floorDetail');
    expect(BUD_CUT.x).toBeGreaterThanOrEqual(tile.x);
    expect(BUD_CUT.y).toBeGreaterThanOrEqual(tile.y);
    expect(BUD_CUT.x + BUD_CUT.width).toBeLessThanOrEqual(tile.x + tile.width);
    expect(BUD_CUT.y + BUD_CUT.height).toBeLessThanOrEqual(tile.y + tile.height);
  });
});

describe('the tip of a secret flower', () => {
  it('stands right of the signpost, centred on it', () => {
    expect(flowerTipAt(SIGN, 100, 14)).toEqual({ x: SIGN.x + SIGN.width + 2, y: SIGN.y + 1 });
  });

  it('never leaves the canvas, however long it is', () => {
    const at = flowerTipAt(SIGN, CANVAS_WIDTH, 14);
    expect(at.x).toBe(HUB.margin);
    const long = flowerTipAt(SIGN, 440, 14);
    expect(long.x + 440).toBeLessThanOrEqual(CANVAS_WIDTH - HUB.margin);
    const high = flowerTipAt({ ...SIGN, y: -10 }, 50, 14);
    expect(high.y).toBeGreaterThanOrEqual(0);
  });
});
