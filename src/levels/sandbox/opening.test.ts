import { encodeGarden } from '@core/codes/gardenCode';
import { pathGraph } from '@core/generators/families';
import { emptyMatching } from '@core/matching/createMatching';
import { describe, expect, it } from 'vitest';
import { EMPTY_DESIGN, type Design } from './design';
import { importText } from './importText';
import { openingDesign } from './opening';

/** A row of four sprouts in the dark, as a shared link carries it. */
const CODE = encodeGarden(pathGraph(4), emptyMatching(pathGraph(4)));

/** The last design kept: two sprouts joined. */
const KEPT: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100 },
    { label: 'B', x: 150, y: 100 },
  ],
  vines: [['A', 'B']],
  lanterns: [],
};

describe('the design the free mode opens with', () => {
  it('the last design kept, when no link brings one', () => {
    expect(openingDesign(null, KEPT)).toEqual({ design: KEPT, problem: null });
    expect(openingDesign(null, EMPTY_DESIGN)).toEqual({ design: EMPTY_DESIGN, problem: null });
  });

  it("a shared link's garden, read in the free mode's own chunk", () => {
    const read = importText(CODE);
    if (!read.ok) throw new Error('the code should read');
    expect(openingDesign(CODE, KEPT)).toEqual({ design: read.value, problem: null });
  });

  it('a broken code keeps the last design and says so', () => {
    expect(openingDesign('not*a*code', KEPT)).toEqual({ design: KEPT, problem: 'brokenCode' });
    expect(openingDesign(`${CODE}AA`, KEPT).problem).toBe('brokenCode');
  });

  it('a kept design past the limits is set aside for an empty one, and says so', () => {
    const crowded: Design = {
      ...KEPT,
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 105, y: 100 },
      ],
    };
    expect(openingDesign(null, crowded)).toEqual({
      design: EMPTY_DESIGN,
      problem: 'brokenStored',
    });
    expect(openingDesign('not*a*code', crowded)).toEqual({
      design: EMPTY_DESIGN,
      problem: 'brokenCode',
    });
  });
});
