import { itemAt } from '@core/shared/itemAt';
import { unwrap } from '@core/shared/result';
import { cardDemos } from '@levels/cards/catalog';
import { buildDemo } from '@levels/cards/demo';
import { cardsSchema, type CardId } from '@levels/cards/schema';
import { describe, expect, it } from 'vitest';
import { cardDemoPicture, demoLoop } from './cardDemo';

const demos = cardDemos();
const picture = (id: CardId, frame: number) => {
  const demo = demos.get(id);
  if (demo === undefined) throw new Error(`no card ${id}`);
  return cardDemoPicture(demo, frame);
};

describe('the picture of a mechanic card demo', () => {
  it('draws the tiny garden of the frame, without names, and touches on the sprouts', () => {
    const joining = picture('lanterns', 0);
    expect(joining.garden.sprouts.map((sprout) => sprout.label)).toEqual(['', '', '']);
    expect(joining.touches).toEqual([
      { x: 20, y: 27 },
      { x: 60, y: 27 },
    ]);
    expect(joining.garden.sprouts.every((sprout) => !sprout.lit)).toBe(true);
    const joined = picture('lanterns', 1);
    expect(itemAt(joined.garden.sprouts, 0).lit).toBe(true);
  });

  it('a touch on a vine lands on its middle', () => {
    expect(picture('lanterns', 1).touches).toEqual([{ x: 40, y: 27 }]);
  });

  it('a drag is drawn as the chain being dragged; a loop to fold as sprouts chosen', () => {
    expect(picture('chain', 0).garden.chain).toEqual({
      points: [
        { x: 12, y: 27 },
        { x: 44, y: 27 },
        { x: 76, y: 27 },
        { x: 108, y: 27 },
      ],
      preview: 'gain1',
    });
    // A triangle with its base a in the dark, folded as a loop chosen by hand (the free mode).
    const [triangle] = cardsSchema.parse([
      {
        id: 'fold',
        sprouts: [
          { label: 'a', x: 30, y: 42 },
          { label: 'b', x: 60, y: 14 },
          { label: 'c', x: 90, y: 42 },
        ],
        vines: [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'a'],
        ],
        lanterns: [['b', 'c']],
        steps: [{ type: 'fold', loop: ['a', 'b', 'c'] }],
      },
    ]);
    if (triangle === undefined) throw new Error('no card parsed');
    const choosing = cardDemoPicture(unwrap(buildDemo(triangle)), 0).garden.sprouts;
    expect(choosing.map((sprout) => sprout.selected)).toEqual([true, true, true]);
  });

  it('a touch on the garden lands in the middle of its box', () => {
    const reflection = demos.get('reflection');
    const tapFrame = reflection?.frames.findIndex((frame) => frame.gesture.kind === 'tapGarden');
    expect(picture('reflection', tapFrame ?? -1).touches).toEqual([{ x: 60, y: 26 }]);
  });

  it('silver lanterns are drawn between their sprouts', () => {
    expect(picture('reflection', 0).silver).toEqual([
      { a: { x: 12, y: 27 }, b: { x: 44, y: 27 } },
      { a: { x: 76, y: 27 }, b: { x: 108, y: 27 } },
    ]);
  });

  it('the sun is drawn only in demos that move it, where the day stands', () => {
    expect(picture('lanterns', 0).sun).toBeNull();
    expect([0, 1, 2, 3, 4].map((frame) => picture('sun', frame).sun)).toEqual([0, 1, 1, 0, 1]);
  });

  it('choices show under the garden, the picked one lit only on its frame', () => {
    expect(picture('bet', 0).choices).toEqual({ count: 4, kind: 'numbers', picked: 1 });
    expect(picture('bet', 1).choices).toEqual({ count: 4, kind: 'numbers', picked: null });
    expect(picture('lanterns', 0).choices).toBeNull();
  });

  it('a pressed button is named by its interface text', () => {
    expect(picture('undo', 1).press).toBe('hud.undo');
    expect(picture('declareDone', 1).press).toBe('hud.done');
    // The card that teaches presenting a certificate presses the button as it says there.
    expect(picture('present', 1).press).toBe('hud.present');
    expect(picture('draw', 2).press).toBe('hud.checkMirror');
    expect(picture('lanterns', 0).press).toBeNull();
  });

  it('a frame past the end shows the last one', () => {
    expect(picture('bet', 99)).toEqual(picture('bet', 1));
  });

  it('the layers card zooms into the flower entered, and the button to leave is pressed', () => {
    const layers = demos.get('layers');
    if (layers === undefined) throw new Error('no layers card');
    const outside = picture('layers', 5);
    expect(outside.garden.sprouts).toHaveLength(5);
    expect(outside.garden.flowers.map((flower) => flower.id)).toEqual([1, 0]);
    const inner = picture('layers', 7);
    expect(inner.garden.sprouts.map((sprout) => sprout.vertex)).toEqual([2, 3, 4]);
    expect(inner.garden.flowers).toEqual([]);
    expect(inner.press).toBe('hud.leaveLayer');
    // Enlarged: the petals sit farther apart than in the tiny garden itself.
    const [b, c] = [itemAt(inner.garden.sprouts, 0), itemAt(inner.garden.sprouts, 1)];
    const [trueB, trueC] = [itemAt(layers.positions, 2), itemAt(layers.positions, 3)];
    expect(Math.hypot(b.x - c.x, b.y - c.y)).toBeGreaterThan(
      Math.hypot(trueB.x - trueC.x, trueB.y - trueC.y),
    );
  });
});

describe('the loop of a mechanic card', () => {
  it("plays a demo's frames, each one as its picture", () => {
    const demo = demos.get('lanterns');
    if (demo === undefined) throw new Error('no card lanterns');
    const loop = demoLoop(demo);
    expect(loop.frames).toBe(demo.frames.length);
    expect(loop.pictureAt(1)).toEqual(cardDemoPicture(demo, 1));
  });
});
