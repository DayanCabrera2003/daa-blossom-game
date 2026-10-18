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
