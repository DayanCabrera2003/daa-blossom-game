import { SIDE_BY_SIDE } from '@levels/fields';
import { describe, expect, it } from 'vitest';
import { BLOOM, bloomLevel } from '../../../tests/support/fixtureLevels';
import { loadLevel } from '@levels/loader';
import type { Point } from '../input/target';
import { act, drawInGarden, startSession, type LevelSession } from '../systems/levelSession';
import { MOMENT_MS, momentAt, sideBySidePicture } from './sideBySide';

// The bloom garden: b c d f g e t h x = 0…8, the flower b–c=d–f=g–b with b in the dark.
const level = bloomLevel();
const positions: Point[] = level.data.sprouts.map(({ x, y }) => ({ x, y }));
const labels = level.data.sprouts.map((sprout) => sprout.label);
const at = (v: number): Point => positions[v] as Point;
const right = (v: number): Point => ({ x: at(v).x + SIDE_BY_SIDE.shift, y: at(v).y });

const picture = (session: LevelSession, elapsed = 0) =>
  sideBySidePicture(session, positions, labels, elapsed);

describe('the open and the folded garden side by side (4.11)', () => {
  it('the folded garden sits in the right half, the flower at the centre of its petals', () => {
    const shown = picture(startSession(level, 0));
    if (shown === null) throw new Error('a level with a flower shows the folded garden');
    // Folded ids: the flower takes b's place (0); e t h x close up to 1 2 3 4.
    expect(shown.nodes.map((node) => node.label)).toEqual(['', 'e', 't', 'h', 'x']);
    const petals = [0, 1, 2, 3, 4].map(right);
    const centre = {
      x: petals.reduce((sum, p) => sum + p.x, 0) / 5,
      y: petals.reduce((sum, p) => sum + p.y, 0) / 5,
    };
    expect(shown.nodes[0]).toEqual({ at: centre, label: '', lit: false, flower: true });
    expect(shown.nodes[3]).toEqual({ at: right(7), label: 'h', lit: true, flower: false });
    // c–e, d–h and g–t now leave the flower; h=x stays lit.
    expect(shown.vines).toContainEqual({ a: centre, b: right(5), lit: false });
    expect(shown.vines).toContainEqual({ a: right(7), b: right(8), lit: true });
    expect(shown.vines).toHaveLength(6);
    expect(shown.outline.length).toBeGreaterThan(2);
    expect(shown.cut).toBeNull();
  });

  it('a chain drawn is shown cut, its moments in turn: ends, stretch, folded chain', () => {
    const drawn = drawInGarden(startSession(level, 0), [6, 8, 7, 2, 1, 5], 0).session;
    const first = picture(drawn, 0);
    expect(first?.cut).toEqual({
      moment: 1,
      caption: { key: 'flower.ends', params: {} },
      chain: [6, 8, 7, 2, 1, 5].map(at),
      outside: at(6),
      other: at(5),
      base: at(0),
      stretch: [6, 8, 7, 2].map(at),
      folded: [right(6), right(8), right(7), first?.nodes[0]?.at],
    });
    expect(picture(drawn, MOMENT_MS)?.cut?.caption.key).toBe('flower.stretch');
    expect(picture(drawn, 5 * MOMENT_MS)?.cut).toMatchObject({
      moment: 3,
      caption: { key: 'flower.folded' },
    });
  });

  it('a chain that misses the flower is a chain of the folded garden whole', () => {
    const drawn = drawInGarden(startSession(level, 0), [5, 6], 0).session;
    expect(picture(drawn, MOMENT_MS)?.cut?.caption.key).toBe('flower.whole');
  });

  it('a refused drawing shows no cut; a level without a flower shows no folded garden', () => {
    const refused = drawInGarden(startSession(level, 0), [6, 8], 0).session;
    expect(picture(refused)?.cut).toBeNull();
    const loaded = loadLevel({
      ...BLOOM,
      flower: undefined,
      flow: [{ step: 'say', lines: ['ch4.11.sauce.00'] }],
    });
    if (!loaded.ok) throw new Error('fixture does not load');
    expect(picture(startSession(loaded.value, 0))).toBeNull();
  });

  it('nor once the declared flower is no flower of the garden any more', () => {
    const loaded = loadLevel({
      ...BLOOM,
      victory: { type: 'matchingSize', value: 4 },
      flow: [{ step: 'play' }, { step: 'say', lines: ['ch4.11.sauce.00'] }],
      solution: [{ type: 'chain', path: ['e', 'c', 'd', 'f', 'g', 'b'] }],
    });
    if (!loaded.ok) throw new Error('fixture does not load');
    const session = startSession(loaded.value, 0);
    expect(picture(session)).not.toBeNull();
    const played = act(session, { type: 'chain', path: [5, 1, 2, 3, 4, 0] }, 0).session;
    expect(picture(played)).toBeNull();
  });

  it('the moments follow each other and the last one stays', () => {
    expect([0, MOMENT_MS - 1, MOMENT_MS, 2 * MOMENT_MS, 10 * MOMENT_MS].map(momentAt)).toEqual([
      1, 1, 2, 3, 3,
    ]);
  });
});
