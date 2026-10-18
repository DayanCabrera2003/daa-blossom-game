import { describe, expect, it } from 'vitest';
import { gardenFit, MIN_GARDEN_HEIGHT, type DiagramRoom } from './diagramFit';

/** A wide garden (2:1) on a page of 251 x 179 logical pixels, at zoom 1. */
const room = (changes: Partial<DiagramRoom> = {}): DiagramRoom => ({
  page: { width: 251, height: 179 },
  top: 0,
  kept: 40,
  picture: { width: 200, height: 100 },
  unit: 1,
  columns: 1,
  gap: 2,
  ...changes,
});

describe('how big a garden of the Codex is drawn on its page', () => {
  it('with room to spare, at one logical pixel per unit of its picture', () => {
    expect(gardenFit(room())).toEqual({ width: 200, height: 100, atOpen: true });
  });

  it('never wider than the page', () => {
    const fit = gardenFit(room({ picture: { width: 400, height: 100 } }));
    expect(fit).toEqual({ width: 251, height: 62, atOpen: true });
  });

  it('scales with the zoom: the units are screen pixels', () => {
    const fit = gardenFit(room({ page: { width: 753, height: 537 }, kept: 120, unit: 3, gap: 6 }));
    expect(fit).toEqual({ width: 600, height: 300, atOpen: true });
  });

  it('shrinks so that it and everything kept under it are seen at once when the page opens', () => {
    // 179 - 30 above - 40 kept leaves 109 of height: the garden 2:1 is 218 wide at most.
    const fit = gardenFit(room({ top: 30, picture: { width: 300, height: 150 } }));
    expect(fit).toEqual({ width: 218, height: 109, atOpen: true });
    expect(fit.height + 30 + 40).toBeLessThanOrEqual(179);
  });

  it('when the text above leaves too little, it fits the whole page and the reader scrolls to it', () => {
    // 179 - 100 - 40 is 39, under the smallest garden still read; on its own the page leaves 139.
    const fit = gardenFit(room({ top: 100, picture: { width: 300, height: 150 } }));
    expect(fit).toEqual({ width: 251, height: 125, atOpen: false });
    expect(fit.height + 40).toBeLessThanOrEqual(179);
  });

  it('never smaller than the smallest garden still read, even on a page too short for it', () => {
    const fit = gardenFit(
      room({ page: { width: 251, height: 120 }, picture: { width: 300, height: 150 } }),
    );
    expect(fit.height).toBe(MIN_GARDEN_HEIGHT);
    expect(fit.atOpen).toBe(false);
  });

  it('two gardens side by side share the width, a gap between them', () => {
    const fit = gardenFit(room({ columns: 2, picture: { width: 144, height: 100 } }));
    expect(fit).toEqual({ width: 124, height: 86, atOpen: true });
  });

  it('a picture with no height is drawn at the width it may take', () => {
    expect(gardenFit(room({ picture: { width: 100, height: 0 } }))).toEqual({
      width: 100,
      height: 0,
      atOpen: true,
    });
  });
});
