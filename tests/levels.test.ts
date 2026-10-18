import { checkCodex } from '@levels/codexChecks';
import { checkIntegrity } from '@levels/integrity';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { expectedPath, readLevelFiles } from '../tools/levelFiles';

const files = readLevelFiles();

describe('level integrity (every level file)', () => {
  it('the first fixtures of the plan are there', () => {
    const ids = files.map((file) => (file.json as { id?: string }).id);
    for (const id of [
      '0.1',
      '1.1',
      '4.1',
      '4.3',
      '4.6',
      '4.7',
      '4.9',
      '4.10',
      '5.1',
      '7.2',
      '7.3',
      '7.4',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('no two files share a level id', () => {
    const ids = files.map((file) => (file.json as { id?: string }).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the drafts written before scripts open with the lines they always said, then play', () => {
    const opening: Record<string, string[]> = {
      '0.1': ['ch0.1.sauce.00'],
    };
    for (const { json } of files) {
      const level = loadLevel(json);
      if (!level.ok) continue;
      const lines = opening[level.value.data.id];
      if (lines === undefined) continue;
      expect({ id: level.value.data.id, flow: level.value.data.flow }).toEqual({
        id: level.value.data.id,
        flow: [
          { step: 'say', lines },
          { step: 'play', reactions: [] },
        ],
      });
    }
  });

  it('the catalog opens the whole Codex, and every notebook link points forward', () => {
    const levels = files.map(({ path, json }) => {
      const level = loadLevel(json);
      if (!level.ok) throw new Error(`${path} does not load: ${JSON.stringify(level.error)}`);
      return level.value.data;
    });
    expect(checkCodex(levels)).toEqual([]);
    const opens = (id: string) => levels.find((level) => level.id === id)?.unlocks.codex;
    expect(opens('0.5')).toEqual([{ entry: 'C1', tabs: ['intuition'] }]);
    expect(opens('1.8')).toEqual(['C1', 'C2', 'C13']);
    expect(opens('7.5')).toEqual(['C14']);
  });

  describe.each(files)('$path', ({ path, json }) => {
    it('loads, sits where its id says, and is sound', () => {
      const level = loadLevel(json);
      if (!level.ok) throw new Error(`${path} does not load: ${JSON.stringify(level.error)}`);
      expect(path).toBe(expectedPath(level.value.data.id));
      expect(checkIntegrity(level.value)).toEqual([]);
    });
  });
});
