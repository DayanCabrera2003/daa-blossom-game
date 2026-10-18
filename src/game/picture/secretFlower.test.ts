import { describe, expect, it } from 'vitest';
import type { SecretFlowerState } from '@services/secretFlowers';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { frameRect } from '../assets/frames';
import { assetEntry } from '../assets/keys';
import type { Rect } from './boxDistance';
import { HUB } from './hubLayout';
import { BLOOM_SIZE, BUD_CUT, flowerTipAt, secretFlowerPicture } from './secretFlower';
import { STAR_SIZE } from './starIcon';

/** A chapter's signpost, as `signBox` puts it. */
const SIGN: Rect = { x: HUB.margin, y: 39, width: 16, height: 16 };

const STATES: SecretFlowerState[] = [
  { kind: 'none' },
  { kind: 'bud', need: 14, have: 11 },
  { kind: 'open' },
  { kind: 'won', stars: 2 },
];

/** The box a piece covers on the canvas. */
function pieceBox(piece: ReturnType<typeof secretFlowerPicture>['pieces'][number]): Rect {
  if (piece.kind === 'bud')
    return { x: piece.x, y: piece.y, width: BUD_CUT.width, height: BUD_CUT.height };
  if (piece.kind === 'bloom') return { x: piece.x, y: piece.y, ...BLOOM_SIZE };
  return { x: piece.x, y: piece.y, width: STAR_SIZE, height: STAR_SIZE };
}

describe('the secret flower on a signpost', () => {
  it('shows nothing and takes no touch while its chapter is unfinished', () => {
    expect(secretFlowerPicture({ kind: 'none' }, SIGN)).toEqual({
      pieces: [],
      hit: null,
      tip: null,
      press: null,
    });
  });

  it('a bud is the two leaves of a sprout, says how many stars are missing and tells on a touch', () => {
    const bud = secretFlowerPicture({ kind: 'bud', need: 14, have: 11 }, SIGN);
    expect(bud.pieces.map((piece) => piece.kind)).toEqual(['bud']);
    expect(bud.tip).toEqual({ key: 'hub.secret.budTip', params: { missing: 3 } });
    expect(bud.press).toEqual({
      kind: 'tell',
      text: { key: 'hub.secret.bud', params: { need: 14, have: 11 } },
    });
  });

  it('an open flower sways and is entered with a touch', () => {
    const open = secretFlowerPicture({ kind: 'open' }, SIGN);
    expect(open.pieces).toEqual([
      expect.objectContaining({ kind: 'bloom', sways: true, golden: false }),
    ]);
    expect(open.tip).toEqual({ key: 'hub.secret.openTip', params: {} });
    expect(open.press).toEqual({ kind: 'play' });
  });

  it('a won flower is golden and still, with a star under it, and can be played again', () => {
    const won = secretFlowerPicture({ kind: 'won', stars: 2 }, SIGN);
    expect(won.pieces.map((piece) => piece.kind)).toEqual(['bloom', 'star']);
    expect(won.pieces[0]).toEqual(expect.objectContaining({ sways: false, golden: true }));
    expect(won.tip).toEqual({ key: 'hub.secret.wonTip', params: { stars: 2 } });
    expect(won.press).toEqual({ kind: 'play' });
  });

  it.each(STATES.filter((state) => state.kind !== 'none'))(
    'is touched on the whole signpost and draws inside it (%o)',
    (state) => {
      const picture = secretFlowerPicture(state, SIGN);
      expect(picture.hit).toEqual(SIGN);
      for (const piece of picture.pieces) {
        const box = pieceBox(piece);
        expect(box.x).toBeGreaterThanOrEqual(SIGN.x);
        expect(box.y).toBeGreaterThanOrEqual(SIGN.y);
        expect(box.x + box.width).toBeLessThanOrEqual(SIGN.x + SIGN.width);
        expect(box.y + box.height).toBeLessThanOrEqual(SIGN.y + SIGN.height);
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
