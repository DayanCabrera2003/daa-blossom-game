// The shape of the hand-written asset selection: which packs, which files of them, and what each
// file becomes in the game.
import type { AssetKind, LoadGroup, PackCredit } from '../../src/game/assets/manifestSchema';

/** A pack zip in `assets-src/packs/`, pinned by its checksum, with what its credits say. */
export interface PackSource extends PackCredit {
  /** The zip's file name in `assets-src/packs/`. */
  readonly zip: string;
  /** The sha256 of the zip as downloaded: a different download is refused, never mixed in. */
  readonly sha256: string;
  /** The folder every entry of the pack lives under inside the zip ('' when entries are at the top). */
  readonly root: string;
}

/** How a file is turned into its game copy: as it is, or (wave files) mono at 22.05 kHz. */
export type Conversion = 'copy' | 'mono22k';

/** One chosen file of a pack and what it becomes. */
export interface SelectedFile {
  /** The key the game loads it by, e.g. `tiles.nature` or `sfx.putOut`. */
  readonly key: string;
  /** The id of its pack in the selection. */
  readonly pack: string;
  /** Its path inside the pack, under the pack's root. */
  readonly entry: string;
  /** Where it goes, relative to `public/assets/`. */
  readonly out: string;
  readonly kind: AssetKind;
  readonly group: LoadGroup;
  readonly convert: Conversion;
  /** Sheets only: the size of one frame in pixels. */
  readonly frame?: { readonly width: number; readonly height: number };
}

/**
 * A file the project makes itself instead of taking it from a pack (the bells synthesized from
 * versioned parameters, section 1.8): the second source of the manifest, next to the packs.
 */
export interface MadeFile {
  readonly key: string;
  /** What it is made from, as the credits name it (the name of its parameters). */
  readonly source: string;
  /** Where it goes, relative to `public/assets/`. */
  readonly out: string;
  readonly kind: AssetKind;
  readonly group: LoadGroup;
  /** Makes its bytes: the same on every run, so the committed copy can be checked. */
  readonly make: () => Uint8Array;
}

/** The project's own work: credited in the manifest like a pack, but made by its own tools. */
export interface OwnWork {
  /** The id its files name as their pack in the manifest. */
  readonly id: string;
  readonly credit: PackCredit;
  readonly files: readonly MadeFile[];
}

/** Every pack and every chosen file, in the order the manifest lists them, then the own work. */
export interface Selection {
  readonly packs: Readonly<Record<string, PackSource>>;
  readonly files: readonly SelectedFile[];
  /** Files the project makes itself, listed after every pack file. */
  readonly own?: OwnWork;
}
