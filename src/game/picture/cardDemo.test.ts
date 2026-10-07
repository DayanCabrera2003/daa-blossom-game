import { itemAt } from '@core/shared/itemAt';
import { cardDemos } from '@levels/cards/catalog';
import type { CardId } from '@levels/cards/schema';
import { describe, expect, it } from 'vitest';
import { cardDemoPicture } from './cardDemo';

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
      gain: 1,
    });
    const choosing = picture('unfold', 0).garden.sprouts;
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
    expect(picture('draw', 2).press).toBe('hud.checkMirror');
    expect(picture('lanterns', 0).press).toBeNull();
  });

  it('a frame past the end shows the last one', () => {
    expect(picture('bet', 99)).toEqual(picture('bet', 1));
  });
});
