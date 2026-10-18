import { describe, expect, it } from 'vitest';
import { encodeGarden } from '@core/codes/gardenCode';
import { pathGraph } from '@core/generators/families';
import { emptyMatching } from '@core/matching/createMatching';
import { requestedGarden } from './startGarden';

/** The code of a row of four sprouts, all dark. */
const CODE = encodeGarden(pathGraph(4), emptyMatching(pathGraph(4)));

describe('opening the free mode with a garden from a link (`?garden=`)', () => {
  it('gives the code of the address, for players and in teacher mode', () => {
    expect(requestedGarden(`?garden=${CODE}`)).toBe(CODE);
    expect(requestedGarden(`?teacher&garden=${CODE}`)).toBe(CODE);
  });

  it('ignores an address without a garden, or with a broken code', () => {
    expect(requestedGarden('')).toBeNull();
    expect(requestedGarden('?teacher&level=4.1')).toBeNull();
    expect(requestedGarden('?garden=')).toBeNull();
    expect(requestedGarden('?garden=not*a*code')).toBeNull();
    expect(requestedGarden(`?garden=${CODE}AA`)).toBeNull();
  });
});
