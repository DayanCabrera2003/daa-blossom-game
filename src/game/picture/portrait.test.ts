import { describe, expect, it } from 'vitest';
import { assetEntry } from '../assets/keys';
import { frameRect } from '../assets/frames';
import { SPEAKERS } from '../systems/speaker';
import { OAK_FACE, PORTRAIT_BOX, portraitOf } from './portrait';

describe('the portrait beside the dialogue box (plan 06, section 1.3)', () => {
  it('every speaker with a voice has a portrait; the player and the notebook have none', () => {
    const voiced = SPEAKERS.filter((speaker) => portraitOf(speaker) !== null);
    expect(voiced).toEqual(['sauce', 'bruto', 'oaks']);
  });

  it('the mentor and the gnome are facesets of the pack, and only the gnome hops as he talks', () => {
    expect(portraitOf('sauce')).toEqual({
      kind: 'faceset',
      texture: 'portrait.sauce',
      hops: false,
    });
    expect(portraitOf('bruto')).toEqual({ kind: 'faceset', texture: 'portrait.bruto', hops: true });
  });

  it('a faceset fills the inside of the frame exactly', () => {
    for (const texture of ['portrait.sauce', 'portrait.bruto'] as const) {
      expect(assetEntry(texture).image).toEqual({
        width: PORTRAIT_BOX.inner,
        height: PORTRAIT_BOX.inner,
      });
    }
    expect(assetEntry(PORTRAIT_BOX.texture).image).toEqual({
      width: PORTRAIT_BOX.size,
      height: PORTRAIT_BOX.size,
    });
    expect(PORTRAIT_BOX.inset * 2 + PORTRAIT_BOX.inner).toBeLessThanOrEqual(PORTRAIT_BOX.size);
  });

  it('the Council is the round tree of the tileset with a face drawn on its crown', () => {
    const oaks = portraitOf('oaks');
    expect(oaks?.kind).toBe('oak');
    if (oaks?.kind !== 'oak') return;
    const tree = frameRect(oaks.tree);
    // The tree sits inside the frame, centred.
    expect(oaks.at.x * 2 + tree.width).toBe(PORTRAIT_BOX.inner);
    expect(oaks.at.y * 2 + tree.height).toBe(PORTRAIT_BOX.inner);
    // Every stroke of the face lies on the crown: the upper half of the tree.
    for (const stroke of oaks.face) {
      expect(stroke.x).toBeGreaterThanOrEqual(0);
      expect(stroke.x + stroke.width).toBeLessThanOrEqual(tree.width);
      expect(stroke.y).toBeGreaterThanOrEqual(0);
      expect(stroke.y + stroke.height).toBeLessThanOrEqual(tree.height / 2);
    }
  });

  it('the oak face has two eyes under two mossy brows and a mouth below them', () => {
    const of = (part: string) => OAK_FACE.filter((stroke) => stroke.part === part);
    const [eyes, brows, mouths] = [of('eye'), of('brow'), of('mouth')];
    expect(eyes).toHaveLength(2);
    expect(brows).toHaveLength(2);
    expect(mouths).toHaveLength(1);
    for (const brow of brows) {
      for (const eye of eyes) expect(brow.y + brow.height).toBeLessThanOrEqual(eye.y);
    }
    for (const eye of eyes) {
      expect(eye.y + eye.height).toBeLessThan(mouths[0]?.y ?? 0);
    }
  });
});
