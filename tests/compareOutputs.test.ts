import { describe, expect, it } from 'vitest';
import { compareOutputs } from '../tools/assets/compareOutputs';
import type { OutputFile } from '../tools/assets/extract';

const bytes = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));

const OUTPUTS: OutputFile[] = [
  { path: 'public/assets/images/a.png', bytes: bytes('a') },
  { path: 'public/assets/audio/b.ogg', bytes: bytes('b') },
  { path: 'src/game/assets/manifest.json', bytes: bytes('{}') },
];

/** A disk holding exactly these files. */
const disk = (files: Readonly<Record<string, string>>) => ({
  read: (path: string) => (path in files ? bytes(files[path] ?? '') : null),
  listAssets: () => Object.keys(files).filter((path) => path.startsWith('public/assets/')),
});

describe('comparing the extraction with the committed files', () => {
  it('finds nothing when every file is there with the same bytes', () => {
    const same = disk({
      'public/assets/images/a.png': 'a',
      'public/assets/audio/b.ogg': 'b',
      'src/game/assets/manifest.json': '{}',
    });
    expect(compareOutputs(OUTPUTS, same)).toEqual([]);
  });

  it('names a missing file, a changed one and one the selection does not give', () => {
    const drifted = disk({
      'public/assets/images/a.png': 'A',
      'public/assets/images/stray.png': 's',
      'src/game/assets/manifest.json': '{}',
    });
    expect(compareOutputs(OUTPUTS, drifted)).toEqual([
      'public/assets/images/a.png differs from what the packs give',
      'public/assets/audio/b.ogg is missing',
      'public/assets/images/stray.png is not in the selection',
    ]);
  });
});
