// Tells whether the committed assets are exactly what the packs give: the check behind
// `npm run assets:check`, which proves the files in the repository come from the pinned zips.
import type { OutputFile } from './extract';

/** The committed side of the comparison, read from the working tree by the CLI. */
export interface CommittedFiles {
  /** The bytes at a path relative to the repository root, or null when there is no such file. */
  read(path: string): Uint8Array | null;
  /** Every file under `public/assets/`, as paths relative to the repository root. */
  listAssets(): readonly string[];
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * One readable line per disagreement: a file missing or different from what the extraction
 * gives, then any file under `public/assets/` that no chosen file explains. Empty when they agree.
 */
export function compareOutputs(
  outputs: readonly OutputFile[],
  committed: CommittedFiles,
): string[] {
  const problems: string[] = [];
  for (const { path, bytes } of outputs) {
    const current = committed.read(path);
    if (current === null) problems.push(`${path} is missing`);
    else if (!sameBytes(current, bytes)) problems.push(`${path} differs from what the packs give`);
  }
  const expected = new Set(outputs.map((output) => output.path));
  for (const path of committed.listAssets()) {
    if (!expected.has(path)) problems.push(`${path} is not in the selection`);
  }
  return problems;
}
