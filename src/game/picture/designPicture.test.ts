import { itemAt } from '@core/shared/itemAt';
import { EMPTY_DESIGN, editDesign, type Design } from '@levels/sandbox/design';
import { describe, expect, it } from 'vitest';
import {
  designMove,
  designPress,
  designRelease,
  initialDesignPointer,
  type DesignPointer,
} from '../input/designIntent';
import { designPicture } from './designPicture';

/** A bee at (100, 100), a flower at (160, 100) and a bee at (100, 160); A–B lit, A–C dark. */
const GARDEN: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100, kind: 'bee' },
    { label: 'B', x: 160, y: 100, kind: 'flower' },
    { label: 'C', x: 100, y: 160, kind: 'bee' },
  ],
  vines: [
    ['A', 'B'],
    ['C', 'A'],
  ],
  lanterns: [['A', 'B']],
};

/** The pointer holding `tool`, pressed at the first point and dragged through the rest. */
function dragging(tool: DesignPointer['tool'], ...points: { x: number; y: number }[]) {
  const [first, ...rest] = points as [{ x: number; y: number }, ...{ x: number; y: number }[]];
  let pointer = designPress(initialDesignPointer(tool), GARDEN, first);
  for (const point of rest) pointer = designMove(pointer, point);
  return pointer;
}

describe('the picture of a design', () => {
  it('draws each sprout where it sits, named, bee or flower, lit when it holds a lantern', () => {
    const { sprouts } = designPicture(GARDEN, initialDesignPointer('sprout'));
    expect(
      sprouts.map(({ vertex, x, y, label, kind, lit }) => [vertex, x, y, label, kind, lit]),
    ).toEqual([
      [0, 100, 100, 'A', 'bee', true],
      [1, 160, 100, 'B', 'flower', true],
      [2, 100, 160, 'C', 'bee', false],
    ]);
    expect(sprouts.every((s) => s.mark === null && !s.stone && !s.scarecrow)).toBe(true);
  });

  it('draws each vine between its sprouts, lit where a lantern hangs, never fogged', () => {
    const { vines, flowers, fog, oddGroups, chain } = designPicture(
      GARDEN,
      initialDesignPointer('sprout'),
    );
    expect(vines.map(({ u, v, lit, visible }) => [u, v, lit, visible])).toEqual([
      [0, 1, true, true],
      [2, 0, false, true],
    ]);
    expect(itemAt(vines, 1).a).toEqual({ x: 100, y: 160 });
    expect([flowers, fog, oddGroups, chain]).toEqual([[], null, [], null]);
  });

  it('a garden without bees and flowers draws plain sprouts', () => {
    const plain: Design = { ...EMPTY_DESIGN, sprouts: [{ label: 'A', x: 50, y: 50 }] };
    expect(itemAt(designPicture(plain, initialDesignPointer('sprout')).sprouts, 0).kind).toBeNull();
  });

  it('rings the sprout chosen by a first touch of the vine tool', () => {
    const chosen = { ...initialDesignPointer('vine'), selected: 'C' };
    const { sprouts } = designPicture(GARDEN, chosen);
    expect(sprouts.map((s) => s.selected)).toEqual([false, false, true]);
  });

  it('a dragged sprout follows the hand, its vines with it', () => {
    const { sprouts, vines } = designPicture(
      GARDEN,
      dragging('move', { x: 100, y: 160 }, { x: 250.4, y: 200 }),
    );
    expect(itemAt(sprouts, 2)).toMatchObject({ x: 250, y: 200 });
    expect(itemAt(vines, 1).a).toEqual({ x: 250, y: 200 });
    expect(sprouts.some((s) => s.highlighted)).toBe(false);
  });

  it('warns while a dragged sprout is too close: the sprouts it crowds are ringed', () => {
    const { sprouts } = designPicture(
      GARDEN,
      dragging('sprout', { x: 100, y: 160 }, { x: 150, y: 110 }),
    );
    expect(sprouts.map((s) => s.highlighted)).toEqual([false, true, false]);
  });

  it('a press not yet dragged, or a drag from the grass, moves nothing', () => {
    const pressed = designPress(initialDesignPointer('move'), GARDEN, { x: 100, y: 100 });
    expect(itemAt(designPicture(GARDEN, pressed).sprouts, 0)).toMatchObject({ x: 100, y: 100 });
    const grass = dragging('move', { x: 300, y: 200 }, { x: 350, y: 200 });
    expect(designPicture(GARDEN, grass).sprouts.map((s) => s.x)).toEqual([100, 160, 100]);
  });

  it('a vine being drawn runs from its sprout to the hand, and snaps green onto a sprout', () => {
    const loose = designPicture(GARDEN, dragging('vine', { x: 160, y: 100 }, { x: 200, y: 200 }));
    expect(loose.chain).toEqual({
      points: [
        { x: 160, y: 100 },
        { x: 200, y: 200 },
      ],
      gain: 0,
    });
    const snapped = designPicture(GARDEN, dragging('vine', { x: 160, y: 100 }, { x: 103, y: 158 }));
    expect(snapped.chain).toEqual({
      points: [
        { x: 160, y: 100 },
        { x: 100, y: 160 },
      ],
      gain: 1,
    });
    expect(snapped.sprouts.map((s) => s.inChain)).toEqual([false, true, true]);
  });

  it('a drag with the other tools draws nothing of its own', () => {
    const picture = designPicture(
      GARDEN,
      dragging('lantern', { x: 160, y: 100 }, { x: 200, y: 200 }),
    );
    expect(picture.chain).toBeNull();
    expect(picture.sprouts.map((s) => s.x)).toEqual([100, 160, 100]);
  });

  it('let go too close, the sprout is refused with the reason and drawn back at its place', () => {
    const held = dragging('move', { x: 100, y: 160 }, { x: 150, y: 110 });
    const { pointer, edit } = designRelease(held, GARDEN, { x: 150, y: 110 });
    if (edit === null) throw new Error('the drag should ask for a move');
    expect(editDesign(GARDEN, edit)).toEqual({ ok: false, error: 'tooClose' });
    expect(itemAt(designPicture(GARDEN, pointer).sprouts, 2)).toMatchObject({ x: 100, y: 160 });
  });
});
