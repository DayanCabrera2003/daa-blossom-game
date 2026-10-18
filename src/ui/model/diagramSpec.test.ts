import { describe, expect, it } from 'vitest';
import { parseDiagramSpec } from './diagramSpec';

/** The issues of a block that does not parse, or the spec of one that does. */
const parse = (block: unknown) => parseDiagramSpec(JSON.stringify(block));

describe('parseDiagramSpec', () => {
  it('reads a garden to play on a level, with the moves it allows', () => {
    expect(parse({ kind: 'play', level: '1.1', moves: ['join', 'split'] })).toEqual({
      ok: true,
      value: { kind: 'play', level: '1.1', moves: ['join', 'split'] },
    });
  });

  it('reads a replayed day from a level, a card or a garden code, with its title and help', () => {
    const replay = { kind: 'replay', level: '4.6', trace: 'edmonds', title: 'a', help: 'b' };
    expect(parse(replay)).toEqual({ ok: true, value: replay });
    expect(parse({ kind: 'replay', card: 'lanterns', trace: 'edmonds' }).ok).toBe(true);
    expect(parse({ kind: 'play', code: 'AQYA', moves: ['chain'] }).ok).toBe(true);
  });

  it('wants exactly one garden: a level, a card or a code', () => {
    expect(parse({ kind: 'play', moves: ['join'] }).ok).toBe(false);
    expect(parse({ kind: 'play', level: '1.1', code: 'AQYA', moves: ['join'] }).ok).toBe(false);
  });

  it('refuses an unknown kind, move, trace, card, level id or field, and moves twice', () => {
    expect(parse({ kind: 'dance', level: '1.1' }).ok).toBe(false);
    expect(parse({ kind: 'play', level: '1.1', moves: ['fold'] }).ok).toBe(false);
    expect(parse({ kind: 'play', level: '1.1', moves: [] }).ok).toBe(false);
    expect(parse({ kind: 'play', level: '1.1', moves: ['join', 'join'] }).ok).toBe(false);
    expect(parse({ kind: 'replay', level: '1.1', trace: 'guess' }).ok).toBe(false);
    expect(parse({ kind: 'replay', card: 'nope', trace: 'edmonds' }).ok).toBe(false);
    expect(parse({ kind: 'replay', level: 'one', trace: 'edmonds' }).ok).toBe(false);
    expect(parse({ kind: 'replay', level: '1.1', trace: 'edmonds', size: 3 }).ok).toBe(false);
  });

  it('replays the reference solution only of a level, which is the only garden that has one', () => {
    expect(parse({ kind: 'replay', level: '3.4', trace: 'solution' }).ok).toBe(true);
    expect(parse({ kind: 'replay', code: 'AQYA', trace: 'solution' }).ok).toBe(false);
  });

  it('reads the special diagrams of phase 5, each on the garden it needs', () => {
    for (const kind of ['cover', 'stones', 'recipe']) {
      expect(parse({ kind, level: '3.8' })).toEqual({ ok: true, value: { kind, level: '3.8' } });
      expect(parse({ kind, code: 'AQYA' }).ok).toBe(true);
    }
    // The pond needs a level's reflection, the cut a level's flower: a level, nothing else.
    for (const kind of ['pond', 'cut']) {
      expect(parse({ kind, level: '2.1', help: 'a' }).ok).toBe(true);
      expect(parse({ kind, code: 'AQYA' }).ok).toBe(false);
    }
    expect(parse({ kind: 'cover', level: '3.8', moves: ['join'] }).ok).toBe(false);
  });

  it('reads the chart of the races of some levels, which has no garden of its own', () => {
    expect(parse({ kind: 'chart', races: ['6.4', '6.5'] })).toEqual({
      ok: true,
      value: { kind: 'chart', races: ['6.4', '6.5'] },
    });
    expect(parse({ kind: 'chart', races: [] }).ok).toBe(false);
    expect(parse({ kind: 'chart', races: ['six'] }).ok).toBe(false);
    expect(parse({ kind: 'chart', races: ['6.4'], level: '6.4' }).ok).toBe(false);
  });

  it('says why a block is no JSON at all', () => {
    const parsed = parseDiagramSpec('{ kind: play');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error[0]).toMatch(/JSON/);
  });

  it('names the place of each issue', () => {
    const parsed = parse({ kind: 'play', level: '1.1', moves: ['fold'] });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.some((issue) => issue.startsWith('moves.0'))).toBe(true);
  });
});
