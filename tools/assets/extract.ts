// From the hand-written selection and the pack zips, the files the game ships and the manifest
// that describes them. Pure but for the zip reading, which is injected, so it is tested with
// archives built in memory and the CLI decides whether to write the result or compare it.
import { createHash } from 'node:crypto';
import { invariant } from '../../src/core/shared/invariant';
import type { Manifest, ManifestEntry, PackCredit } from '../../src/game/assets/manifestSchema';
import { makeOwnWork } from './ownWork';
import { pngSize } from './pngSize';
import type { PackSource, SelectedFile, Selection } from './types';
import { toMono22k } from './wav';
import { openZip, type ZipArchive } from './zip';

/** Where the generated manifest lives, relative to the repository root. */
export const MANIFEST_PATH = 'src/game/assets/manifest.json';

/** Where extracted files live, relative to the repository root; the page serves them as `assets/`. */
const PUBLIC_DIR = 'public/';
const ASSETS_DIR = 'assets/';

/** A file to write (or to compare), with its path relative to the repository root. */
export interface OutputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

/** Every output file, the manifest last, and the manifest itself. */
export interface Extraction {
  readonly files: readonly OutputFile[];
  readonly manifest: Manifest;
}

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Throws on a repeated key or output path: either would make one file silently replace another. */
function checkUnique(files: readonly Pick<SelectedFile, 'key' | 'out'>[]): void {
  const keys = new Set<string>();
  const outs = new Set<string>();
  for (const file of files) {
    if (keys.has(file.key)) throw new Error(`the key ${file.key} is chosen twice`);
    if (outs.has(file.out)) throw new Error(`two files would be written to ${file.out}`);
    keys.add(file.key);
    outs.add(file.out);
  }
}

/** Opens each pack a file needs once, refusing a zip that is not the download written down. */
function openPacks(
  selection: Selection,
  readZip: (zip: string) => Uint8Array,
): Map<string, ZipArchive> {
  const archives = new Map<string, ZipArchive>();
  for (const file of selection.files) {
    if (archives.has(file.pack)) continue;
    const pack = selection.packs[file.pack];
    if (pack === undefined) throw new Error(`${file.key} comes from an unknown pack ${file.pack}`);
    const bytes = readZip(pack.zip);
    const actual = sha256(bytes);
    if (actual !== pack.sha256) {
      throw new Error(`${pack.zip} has sha256 ${actual}, but the selection expects ${pack.sha256}`);
    }
    archives.set(file.pack, openZip(bytes));
  }
  return archives;
}

/** The size facts of an image or sheet; a frame belongs to sheets only and must fit the picture. */
function imageFacts(file: SelectedFile, bytes: Uint8Array): Pick<ManifestEntry, 'image' | 'frame'> {
  const isSheet = file.kind === 'sheet';
  if (isSheet !== (file.frame !== undefined)) {
    throw new Error(`${file.key}: a frame size is given for sheets, and only for sheets`);
  }
  if (file.kind !== 'image' && !isSheet) return {};
  const image = pngSize(bytes);
  if (file.frame === undefined) return { image };
  const { width, height } = file.frame;
  if (width > image.width || height > image.height) {
    throw new Error(`${file.key}: a ${width}×${height} frame does not fit its picture`);
  }
  return { image, frame: { width, height } };
}

/** The credits of a pack, without the details that only matter for extracting it. */
const credit = ({ name, version, author, license, url }: PackSource): PackCredit => ({
  name,
  version,
  author,
  license,
  url,
});

/**
 * Extracts every chosen file and builds the manifest, in selection order. The result is the same
 * on every run, so comparing it with what is committed tells whether the two agree.
 */
export function extract(selection: Selection, readZip: (zip: string) => Uint8Array): Extraction {
  const { own } = selection;
  checkUnique([...selection.files, ...(own?.files ?? [])]);
  if (own !== undefined && own.id in selection.packs) {
    throw new Error(`the own work cannot take the id ${own.id} of a pack`);
  }
  const archives = openPacks(selection, readZip);
  const files: OutputFile[] = [];
  const assets: Record<string, ManifestEntry> = {};
  const packs: Record<string, PackCredit> = {};

  for (const file of selection.files) {
    const pack = selection.packs[file.pack];
    const archive = archives.get(file.pack);
    invariant(pack !== undefined && archive !== undefined, 'openPacks opens every pack named');
    const raw = archive.read(pack.root + file.entry);
    const bytes = file.convert === 'mono22k' ? toMono22k(raw) : raw;
    files.push({ path: PUBLIC_DIR + ASSETS_DIR + file.out, bytes });
    assets[file.key] = {
      path: ASSETS_DIR + file.out,
      kind: file.kind,
      group: file.group,
      pack: file.pack,
      source: file.entry,
      bytes: bytes.length,
      sha256: sha256(bytes),
      ...imageFacts(file, bytes),
    };
    packs[file.pack] = credit(pack);
  }

  // The project's own files (the synthesized bells) come last, credited under its own id.
  if (own !== undefined) {
    const made = makeOwnWork(own);
    files.push(...made.files);
    Object.assign(assets, made.assets);
    packs[own.id] = own.credit;
  }

  const manifest: Manifest = { packs, assets };
  files.push(manifestFile(manifest));
  return { files, manifest };
}

/** The manifest as the JSON file the game imports, two spaces deep and ending in a new line. */
export function manifestFile(manifest: Manifest): OutputFile {
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  return { path: MANIFEST_PATH, bytes: new Uint8Array(Buffer.from(text, 'utf8')) };
}
