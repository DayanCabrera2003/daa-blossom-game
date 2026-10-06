import type { TraceEvent } from '@core/trace/events';
import { describe, expect, it } from 'vitest';
import { describeEvent } from '../tools/describeEvent';

const names = ['R', 'a', 'b', 'c', 'd', 'e'];
const name = (v: number) => names[v] ?? String(v);

describe('readable trace lines', () => {
  it('tells the story of a search with sprout names', () => {
    const lines = (
      [
        { type: 'searchStart', roots: [0, 5] },
        { type: 'labelOuter', vertex: 0, parent: null, root: 0 },
        { type: 'scanEdge', from: 0, to: 1 },
        { type: 'labelInner', vertex: 1, parent: 0, root: 0 },
        { type: 'labelOuter', vertex: 2, parent: 1, root: 0 },
        { type: 'oddCycleFound', vine: [4, 2] },
        {
          type: 'contract',
          blossom: 1,
          base: 0,
          cycle: [
            { kind: 'sprout', vertex: 0 },
            { kind: 'blossom', id: 0 },
            { kind: 'sprout', vertex: 1 },
          ],
        },
        { type: 'expand', blossom: 1 },
        { type: 'augment', path: [0, 1, 2, 4, 3, 5] },
        { type: 'searchFailed' },
        { type: 'done', size: 3 },
      ] satisfies TraceEvent[]
    ).map((event) => describeEvent(event, name));
    expect(lines).toEqual([
      'search starts from the dark: R, e',
      'sun on R (a root)',
      'look R → a',
      'moon on a (reached from R)',
      'sun on b (lantern partner of a)',
      'suns d and b of one tree meet: a flower',
      'fold flower #1 (base R): R, #0, a',
      'open flower #1',
      'pass the lanterns along R–a–b–d–c–e',
      'no chain left: the lanterns are the most possible',
      'done: 3 lanterns',
    ]);
  });

  it('describes the player moves too', () => {
    const lines = (
      [
        { type: 'light', u: 0, v: 1 },
        { type: 'putOut', u: 0, v: 1 },
        { type: 'inspect', vertex: 2, vines: [1, 3] },
        { type: 'chainFound', path: [0, 1] },
        { type: 'searchCleared' },
        { type: 'scarecrow', vertex: 3, placed: true },
        { type: 'scarecrow', vertex: 3, placed: false },
        { type: 'stone', vertex: 4, lifted: true },
        { type: 'stone', vertex: 4, lifted: false },
        { type: 'declareDone' },
      ] satisfies TraceEvent[]
    ).map((event) => describeEvent(event, name));
    expect(lines).toEqual([
      'light a lantern R–a',
      'put out the lantern R–a',
      'inspect b: vines to a, c',
      'chain found: R–a',
      'the lanterns changed: the marks are wiped',
      'scarecrow on c',
      'scarecrow off c',
      'lift the stone on d',
      'put back the stone on d',
      '"Terminé"',
    ]);
  });

  it('a search with nobody in the dark says so', () => {
    expect(describeEvent({ type: 'searchStart', roots: [] }, name)).toBe(
      'search starts: every sprout already has a lantern',
    );
  });
});
