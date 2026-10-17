import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseManifest } from '../src/game/assets/manifestSchema';
import { extract, MANIFEST_PATH } from '../tools/assets/extract';
import { makeOwnWork, withOwnWork } from '../tools/assets/ownWork';
import type { OwnWork, PackSource, SelectedFile, Selection } from '../tools/assets/types';
import { encodeWav, parseWav } from '../tools/assets/wav';
import { buildZip } from './support/buildZip';

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** The first bytes of a 32 × 16 PNG: enough for the size, which is all the extractor reads. */
function png(width: number, height: number): Uint8Array {
  const out = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(out, 0);
  out.writeUInt32BE(13, 8);
  out.write('IHDR', 12, 'ascii');
  out.writeUInt32BE(width, 16);
  out.writeUInt32BE(height, 20);
  return new Uint8Array(out);
}

const SHEET = png(32, 16);
const STEREO = encodeWav({
  sampleRate: 44100,
  channels: [Int16Array.from([10, 20, 30, 40]), Int16Array.from([30, 40, 50, 60])],
});
const SONG = new Uint8Array(Buffer.from('OggS pretend music'));

const ZIP = buildZip([
  { name: 'Pack/Tiles/Nature.png', data: SHEET, method: 'deflate' },
  { name: 'Pack/Voice/Voice1.wav', data: STEREO, method: 'deflate' },
  { name: 'Pack/Music/Song.ogg', data: SONG, method: 'stored' },
]);

const PACK: PackSource = {
  zip: 'pack.zip',
  sha256: sha256(ZIP),
  root: 'Pack/',
  name: 'Test Pack',
  version: '1.0',
  author: 'Someone',
  license: 'CC0-1.0',
  url: 'https://example.org/pack',
};

const UNUSED: PackSource = { ...PACK, zip: 'unused.zip', name: 'Unused Pack' };

const FILES: SelectedFile[] = [
  {
    key: 'tiles.nature',
    pack: 'test',
    entry: 'Tiles/Nature.png',
    out: 'images/tiles/nature.png',
    kind: 'sheet',
    group: 'boot',
    convert: 'copy',
    frame: { width: 16, height: 16 },
  },
  {
    key: 'voice.1',
    pack: 'test',
    entry: 'Voice/Voice1.wav',
    out: 'audio/voice/voice1.wav',
    kind: 'voice',
    group: 'boot',
    convert: 'mono22k',
  },
  {
    key: 'music.ch0',
    pack: 'test',
    entry: 'Music/Song.ogg',
    out: 'audio/music/ch0.ogg',
    kind: 'music',
    group: 'ch0',
    convert: 'copy',
  },
];

const SELECTION: Selection = { packs: { test: PACK, unused: UNUSED }, files: FILES };

/** Reads the fixture zip by name, as the CLI reads `assets-src/packs/`. */
const readZip = (zip: string): Uint8Array => {
  if (zip === 'pack.zip') return ZIP;
  throw new Error(`no such zip ${zip}`);
};

describe('extracting the chosen files', () => {
  it('writes each file under public/assets, then the manifest', () => {
    const { files } = extract(SELECTION, readZip);
    expect(files.map((file) => file.path)).toEqual([
      'public/assets/images/tiles/nature.png',
      'public/assets/audio/voice/voice1.wav',
      'public/assets/audio/music/ch0.ogg',
      MANIFEST_PATH,
    ]);
  });

  it('copies images and music byte for byte', () => {
    const { files } = extract(SELECTION, readZip);
    expect(files[0]?.bytes).toEqual(SHEET);
    expect(files[2]?.bytes).toEqual(SONG);
  });

  it('turns wave files into mono at 22.05 kHz', () => {
    const { files } = extract(SELECTION, readZip);
    const voice = parseWav(files[1]?.bytes ?? new Uint8Array(0));
    expect(voice.sampleRate).toBe(22050);
    expect(voice.channels.map((channel) => [...channel])).toEqual([[25, 45]]);
  });

  it('describes every file in the manifest, with its image size and frame', () => {
    const { manifest, files } = extract(SELECTION, readZip);
    const voiceBytes = files[1]?.bytes ?? new Uint8Array(0);
    expect(manifest.assets['tiles.nature']).toEqual({
      path: 'assets/images/tiles/nature.png',
      kind: 'sheet',
      group: 'boot',
      pack: 'test',
      source: 'Tiles/Nature.png',
      bytes: SHEET.length,
      sha256: sha256(SHEET),
      image: { width: 32, height: 16 },
      frame: { width: 16, height: 16 },
    });
    expect(manifest.assets['voice.1']).toEqual({
      path: 'assets/audio/voice/voice1.wav',
      kind: 'voice',
      group: 'boot',
      pack: 'test',
      source: 'Voice/Voice1.wav',
      bytes: voiceBytes.length,
      sha256: sha256(voiceBytes),
    });
  });

  it('credits only the packs that give a file, without their zip details', () => {
    const { manifest } = extract(SELECTION, readZip);
    expect(manifest.packs).toEqual({
      test: {
        name: 'Test Pack',
        version: '1.0',
        author: 'Someone',
        license: 'CC0-1.0',
        url: 'https://example.org/pack',
      },
    });
  });

  it('writes the manifest as the JSON it holds, ready to be read back', () => {
    const { manifest, files } = extract(SELECTION, readZip);
    const text = Buffer.from(files[3]?.bytes ?? new Uint8Array(0)).toString('utf8');
    expect(text.endsWith('}\n')).toBe(true);
    expect(parseManifest(JSON.parse(text))).toEqual(manifest);
  });

  it('gives the same bytes on every run', () => {
    expect(extract(SELECTION, readZip)).toEqual(extract(SELECTION, readZip));
  });

  it('refuses a zip whose checksum is not the one written down', () => {
    const other = { ...SELECTION, packs: { test: { ...PACK, sha256: '0'.repeat(64) } } };
    expect(() => extract(other, readZip)).toThrow(/pack\.zip.*sha256/);
  });

  it('refuses two files with the same key or the same output path', () => {
    const [first] = FILES;
    if (first === undefined) throw new Error('fixture');
    const sameKey = { ...SELECTION, files: [...FILES, { ...first, out: 'images/other.png' }] };
    expect(() => extract(sameKey, readZip)).toThrow(/tiles\.nature/);
    const samePath = { ...SELECTION, files: [...FILES, { ...first, key: 'tiles.other' }] };
    expect(() => extract(samePath, readZip)).toThrow(/images\/tiles\/nature\.png/);
  });

  it('refuses a file of a pack it does not know', () => {
    const [first] = FILES;
    if (first === undefined) throw new Error('fixture');
    const stray = { ...SELECTION, files: [{ ...first, pack: 'elsewhere' }] };
    expect(() => extract(stray, readZip)).toThrow(/elsewhere/);
  });

  it('refuses a sheet without a frame size, and a frame size on anything else', () => {
    const [sheet, voice] = FILES;
    if (sheet === undefined || voice === undefined) throw new Error('fixture');
    const frameless: SelectedFile = {
      key: sheet.key,
      pack: sheet.pack,
      entry: sheet.entry,
      out: sheet.out,
      kind: sheet.kind,
      group: sheet.group,
      convert: sheet.convert,
    };
    expect(() => extract({ ...SELECTION, files: [frameless] }, readZip)).toThrow(/frame/);
    const framed = { ...voice, frame: { width: 16, height: 16 } };
    expect(() => extract({ ...SELECTION, files: [framed] }, readZip)).toThrow(/frame/);
  });

  it('refuses a sheet whose frame is larger than the picture', () => {
    const [sheet] = FILES;
    if (sheet === undefined) throw new Error('fixture');
    const huge = { ...sheet, frame: { width: 64, height: 16 } };
    expect(() => extract({ ...SELECTION, files: [huge] }, readZip)).toThrow(/frame/);
  });
});

describe('extracting with the own work', () => {
  const BELL = Uint8Array.from([7, 7, 7]);
  const OWN: OwnWork = {
    id: 'own',
    credit: {
      name: 'Original work',
      version: null,
      author: 'The author',
      license: 'MIT',
      url: 'https://example.org/game',
    },
    files: [
      {
        key: 'sfx.bell',
        source: 'bell',
        out: 'audio/sfx/bell.wav',
        kind: 'sfx',
        group: 'boot',
        make: () => BELL,
      },
    ],
  };
  const WITH_OWN: Selection = { ...SELECTION, own: OWN };

  it('writes the made files after every pack file, before the manifest', () => {
    const { files } = extract(WITH_OWN, readZip);
    expect(files.map((file) => file.path).slice(-2)).toEqual([
      'public/assets/audio/sfx/bell.wav',
      MANIFEST_PATH,
    ]);
    expect(files.at(-2)?.bytes).toEqual(BELL);
  });

  it('gives the manifest that putting the own work into the packs-only manifest gives', () => {
    const packsOnly = extract(SELECTION, readZip).manifest;
    const expected = withOwnWork(packsOnly, OWN, makeOwnWork(OWN).assets);
    expect(extract(WITH_OWN, readZip).manifest).toEqual(expected);
  });

  it('refuses a made file written where a pack file goes, or under its key', () => {
    const [bell] = OWN.files;
    if (bell === undefined) throw new Error('fixture');
    const samePath = { ...OWN, files: [{ ...bell, out: 'audio/music/ch0.ogg' }] };
    expect(() => extract({ ...SELECTION, own: samePath }, readZip)).toThrow(/ch0\.ogg/);
    const sameKey = { ...OWN, files: [{ ...bell, key: 'voice.1' }] };
    expect(() => extract({ ...SELECTION, own: sameKey }, readZip)).toThrow(/voice\.1/);
  });

  it('refuses an own work under the id of a pack', () => {
    expect(() => extract({ ...SELECTION, own: { ...OWN, id: 'test' } }, readZip)).toThrow(/test/);
  });
});
