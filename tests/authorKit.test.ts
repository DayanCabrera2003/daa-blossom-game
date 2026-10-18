import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog } from '../src/levels/catalog';
import { requestedCodex, requestedLevel } from '../src/services/startLevel';
import { isSavePoint } from '../tools/saves/points';

// The author's kit (plan 09, phase 11): the playtest kit and the recording script name levels,
// Codex pages, saves and files; every one of them exists, so the author never meets a dead link
// in front of a player or a camera.

const DOCS = ['../docs/playtest/kit.md', '../docs/video/guion.md'] as const;
const ids = catalog().map((level) => level.data.id);

/** A document of the kit, by its path from this file. */
const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

/** Every match of `pattern` (global) in `text`, its first group. */
const all = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].map((match) => match[1] ?? '');

describe.each(DOCS)('%s', (path) => {
  const text = read(path);

  it('links the published game', () => {
    expect(text).toContain('https://dayancabrera2003.github.io/daa-blossom-game/');
  });

  it('opens only levels of the catalog, in teacher mode', () => {
    const asked = all(text, /\?teacher&level=(\d+\.\d+)/g);
    expect(asked.length).toBeGreaterThan(0);
    for (const id of asked) {
      expect(ids, id).toContain(id);
      expect(requestedLevel(`?teacher&level=${id}`, ids)).toBe(id);
    }
  });

  it('opens only real Codex entries, at real tabs', () => {
    for (const query of all(text, /(\?teacher&codex=[^\s`)]+)/g)) {
      const request = requestedCodex(query);
      expect(request, query).not.toBeNull();
      const tab = new URLSearchParams(query).get('tab');
      if (tab !== null) expect(request, query).toMatchObject({ tab });
    }
  });

  it('loads only saves that npm run save makes', () => {
    for (const point of all(text, /npm run save -- ([a-z0-9-]+)/g)) {
      expect(isSavePoint(point), point).toBe(true);
    }
  });

  it('links only files that exist', () => {
    for (const target of all(text, /\]\(([^)\s]+\.md)\)/g)) {
      expect(existsSync(new URL(target, new URL(path, import.meta.url))), target).toBe(true);
    }
  });
});

describe('the recording script', () => {
  it('walks the ten segments of GDD §9 in about thirty minutes', () => {
    const rows = read('../docs/video/guion.md')
      .split('\n')
      .filter((row) => /^\| \d+ \|/.test(row));
    expect(rows).toHaveLength(10);
    const minutes = rows.reduce((sum, row) => sum + Number(row.split('|')[3]?.trim() ?? 0), 0);
    expect(minutes).toBeGreaterThanOrEqual(20);
    expect(minutes).toBeLessThanOrEqual(30);
  });
});
