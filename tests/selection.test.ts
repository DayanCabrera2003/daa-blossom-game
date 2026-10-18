import { describe, expect, it } from 'vitest';
import { SELECTION } from '../tools/assets/selection';

const { packs, files } = SELECTION;

describe('the asset selection', () => {
  it('never repeats a key or an output path', () => {
    const keys = files.map((file) => file.key);
    const outs = files.map((file) => file.out);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(outs).size).toBe(outs.length);
  });

  it('pins every pack by a sha256 and takes only CC0 packs', () => {
    for (const pack of Object.values(packs)) {
      expect(pack.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(pack.license).toBe('CC0-1.0');
    }
  });

  it('takes every file from a pack it lists, and uses every pack it lists', () => {
    const used = new Set(files.map((file) => file.pack));
    expect([...used].sort()).toEqual(Object.keys(packs).sort());
  });

  it('converts exactly the wave files', () => {
    for (const file of files) {
      expect(file.convert).toBe(file.entry.endsWith('.wav') ? 'mono22k' : 'copy');
      expect(file.out.endsWith('.wav')).toBe(file.entry.endsWith('.wav'));
    }
  });

  it('loads only the hub music at boot, and each chapter its own track', () => {
    const music = files.filter((file) => file.kind === 'music');
    expect(music.filter((file) => file.group === 'boot').map((file) => file.key)).toEqual([
      'music.hub',
    ]);
    // Chapter 0 has no pack track: its night is the synthesized crickets (`tools/synth`).
    for (const chapter of [1, 2, 3, 4, 5, 6, 7]) {
      expect(music.some((file) => file.group === `ch${chapter}`)).toBe(true);
    }
    expect(music.some((file) => file.group === 'ch0')).toBe(false);
  });

  it('loads everything that is not music at boot', () => {
    for (const file of files.filter((file) => file.kind !== 'music')) {
      expect(file.group).toBe('boot');
    }
  });

  it('chooses the monogram extended font from its zip', () => {
    const font = files.find((file) => file.kind === 'font');
    expect(font).toMatchObject({ pack: 'monogram', entry: 'ttf/monogram-extended.ttf' });
    expect(packs['monogram']?.sha256).toBe(
      '81d0540290f73d6317dc86e34978af80babf8e24129941cdf087b0fdfb75c287',
    );
  });
});
