import { describe, expect, it } from 'vitest';
import { requestedGarden } from './startGarden';

describe('opening the free mode with a garden from a link (`?garden=`)', () => {
  it('passes the code of the address on as it is, for players and in teacher mode', () => {
    expect(requestedGarden('?garden=AQRA')).toBe('AQRA');
    expect(requestedGarden('?teacher&garden=AQRA')).toBe('AQRA');
  });

  it('leaves a broken code for the free mode to read, and tell the player about', () => {
    expect(requestedGarden('?garden=not*a*code')).toBe('not*a*code');
  });

  it('gives nothing for an address without a garden, or with an empty one', () => {
    expect(requestedGarden('')).toBeNull();
    expect(requestedGarden('?teacher&level=4.1')).toBeNull();
    expect(requestedGarden('?garden=')).toBeNull();
    expect(requestedGarden('?garden=%20%20')).toBeNull();
  });
});
