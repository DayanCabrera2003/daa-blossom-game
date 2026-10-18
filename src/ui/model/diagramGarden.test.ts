import { describe, expect, it } from 'vitest';
import { encodeGarden } from '@core/codes/gardenCode';
import { unwrap } from '@core/shared/result';
import { createGraph } from '@core/graph/createGraph';
import { emptyMatching } from '@core/matching/createMatching';
import { size } from '@core/matching/queries';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { diagramGarden, type DiagramSources } from './diagramGarden';

const levels = catalog();
const cards = cardDemos();

/** The real catalog and cards, as the book hands them over. */
const sources: DiagramSources = {
  level: (id) => levels.find((level) => level.data.id === id),
  card: (id) => cards.get(id),
};

/** A ring of six sprouts, every one in the dark: the benzene of C14. */
const ring = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [0, 5],
  ]),
);

describe('diagramGarden', () => {
  it('takes a level as it starts: its names, places, lanterns and kinds', () => {
    const garden = unwrap(diagramGarden({ level: '1.3' }, sources));
    const level = levels.find((one) => one.data.id === '1.3');
    expect(garden.names).toEqual(level?.data.sprouts.map((sprout) => sprout.label));
    expect(garden.positions[0]).toEqual({ x: 50, y: 150 });
    expect(garden.start).toBe(level?.start);
    expect(garden.level).toBe(level);
    expect(garden.kinds.every((kind) => kind === null)).toBe(true);
  });

  it('keeps who is a bee and who a flower in a garden of both', () => {
    const garden = unwrap(diagramGarden({ level: '3.8' }, sources));
    expect(garden.kinds).toContain('bee');
    expect(garden.kinds).toContain('flower');
  });

  it('builds every level of the catalog', () => {
    for (const level of levels) {
      expect(diagramGarden({ level: level.data.id }, sources).ok).toBe(true);
    }
  });

  it('takes the tiny garden of a card as its demo starts', () => {
    const garden = unwrap(diagramGarden({ card: 'chain' }, sources));
    const demo = cards.get('chain');
    expect(garden.names).toEqual(demo?.names);
    expect(garden.positions).toEqual(demo?.positions);
    expect(garden.start).toBe(demo?.frames[0]?.state);
    expect(garden.level).toBeNull();
  });

  it('lays a garden code out in a ring named A, B, C…, from the top, clockwise', () => {
    const code = encodeGarden(ring, emptyMatching(ring));
    const garden = unwrap(diagramGarden({ code }, sources));
    expect(garden.names).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(garden.start.graph.edges).toEqual(ring.edges);
    expect(size(garden.start.matching)).toBe(0);
    const [top, next] = garden.positions;
    expect(top?.x).toBeCloseTo(0);
    expect(top?.y).toBeLessThan(0);
    expect(next?.x).toBeGreaterThan(0);
    // Every sprout at the same distance from the middle.
    const radii = garden.positions.map(({ x, y }) => Math.hypot(x, y));
    for (const radius of radii) expect(radius).toBeCloseTo(radii[0] ?? 0);
  });

  it('names the sprouts of a long code past Z with numbers', () => {
    const many = unwrap(createGraph(28, []));
    const garden = unwrap(
      diagramGarden({ code: encodeGarden(many, emptyMatching(many)) }, sources),
    );
    expect(garden.names.slice(25)).toEqual(['Z', 'A1', 'B1']);
  });

  it('says which level, card or code is missing or broken', () => {
    expect(diagramGarden({ level: '9.9' }, sources)).toEqual({
      ok: false,
      error: { code: 'noLevel', level: '9.9' },
    });
    expect(diagramGarden({ card: 'chain' }, { ...sources, card: () => undefined })).toEqual({
      ok: false,
      error: { code: 'noCard', card: 'chain' },
    });
    const broken = diagramGarden({ code: '!!' }, sources);
    expect(broken.ok === false && broken.error.code).toBe('badCode');
    expect(diagramGarden({}, sources)).toEqual({ ok: false, error: { code: 'noGarden' } });
  });
});
