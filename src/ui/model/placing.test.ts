import { describe, expect, it } from 'vitest';
import { unwrap } from '@core/shared/result';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramGarden, type DiagramSources } from './diagramGarden';
import {
  placedNow,
  placeExactly,
  placingNow,
  resetPlacing,
  startPlacing,
  touchPlacing,
  undoPlacing,
} from './placing';

const levels = catalog();
const cards = cardDemos();
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};
const gardenOf = (level: string): DiagramGarden => unwrap(diagramGarden({ level }, sources));

const bees = gardenOf('3.8');
const propeller = gardenOf('7.3');

describe('placing pieces on a Codex garden', () => {
  it('starts with nothing placed, allowing only to place and take back its own piece', () => {
    const guard = startPlacing(bees, 'scarecrow');
    expect(placedNow(guard)).toEqual([]);
    expect([...placingNow(guard).allowed].sort()).toEqual(['placeScarecrow', 'removeScarecrow']);
    expect([...placingNow(startPlacing(propeller, 'stone')).allowed].sort()).toEqual([
      'dropStone',
      'liftStone',
    ]);
  });

  it('places a piece on a touched sprout and takes it back on a second touch', () => {
    const lifted = touchPlacing(startPlacing(propeller, 'stone'), 0);
    expect(placingNow(lifted).stones).toEqual([0]);
    expect(placedNow(touchPlacing(lifted, 0))).toEqual([]);
    const guarded = touchPlacing(startPlacing(bees, 'scarecrow'), 1);
    expect(placingNow(guarded).scarecrows).toEqual([1]);
  });

  it('sets the pieces on exactly a target in one step, with marks the next touch wipes', () => {
    const start = touchPlacing(startPlacing(propeller, 'stone'), 1);
    const marks = new Array(10).fill('none');
    const set = placeExactly(start, [0, 4], marks);
    expect([...placedNow(set)].sort()).toEqual([0, 4]);
    expect(set.history).toHaveLength(3);
    expect(set.marks).toBe(marks);
    expect(touchPlacing(set, 2).marks).toBeNull();
  });

  it('undoes one step at a time, and starts again with nothing placed', () => {
    const twice = touchPlacing(touchPlacing(startPlacing(bees, 'scarecrow'), 1), 2);
    expect(placedNow(undoPlacing(twice))).toEqual([1]);
    expect(placedNow(resetPlacing(twice))).toEqual([]);
    expect(undoPlacing(startPlacing(bees, 'scarecrow')).history).toHaveLength(1);
  });
});
