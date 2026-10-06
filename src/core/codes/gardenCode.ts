import { createGraph } from '../graph/createGraph';
import { hasEdge } from '../graph/queries';
import type { Edge, Graph } from '../graph/types';
import { createMatching, type MatchingError } from '../matching/createMatching';
import { isMatchedEdge } from '../matching/queries';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import { err, ok, unwrap, type Result } from '../shared/result';
import { decodeBase64Url, encodeBase64Url, type Base64UrlError } from './base64url';

/** Why a text is not a garden code. */
export type GardenCodeError =
  | { readonly code: 'badText'; readonly error: Base64UrlError }
  | { readonly code: 'unknownVersion'; readonly version: number }
  | { readonly code: 'truncated' }
  | { readonly code: 'trailingData' }
  | { readonly code: 'strayBits' }
  | { readonly code: 'badLanterns'; readonly error: MatchingError };

/** A garden and its lanterns, as carried by a code. */
export interface CodedGarden {
  readonly graph: Graph;
  readonly matching: Matching;
}

const VERSION = 1;
const MAX_SPROUTS = 255;

/** Packs bits into bytes, first bit in the highest position; the padding stays 0. */
const pack = (bits: readonly boolean[]): number[] => {
  const bytes = new Array<number>(Math.ceil(bits.length / 8)).fill(0);
  bits.forEach((bit, k) => {
    if (bit) bytes[k >> 3] = (bytes[k >> 3] as number) | (0x80 >> (k & 7));
  });
  return bytes;
};

/** Reads `count` bits; null if a padding bit after them is set (a non-canonical code). */
const unpack = (bytes: Uint8Array, count: number): boolean[] | null => {
  const bits: boolean[] = [];
  for (let k = 0; k < bytes.length * 8; k++) {
    const bit = ((bytes[k >> 3] as number) & (0x80 >> (k & 7))) !== 0;
    if (k < count) bits.push(bit);
    else if (bit) return null;
  }
  return bits;
};

/** Every pair of sprouts in lexicographic order: the positions of the vine bits. */
const pairsOf = (n: number): Edge[] => {
  const pairs: Edge[] = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) pairs.push([u, v]);
  return pairs;
};

/**
 * A short, shareable code for a garden and its lanterns (sandbox, Códex examples, bug reports):
 * a version byte, the number of sprouts, one bit per pair of sprouts (is there a vine?) and one
 * bit per vine (is it lit?), in base64url. Level 4.1 becomes 7 characters. The code is canonical:
 * a garden has exactly one code.
 */
export function encodeGarden(graph: Graph, matching: Matching): string {
  invariant(graph.n <= MAX_SPROUTS, `garden codes hold at most ${MAX_SPROUTS} sprouts`);
  const vines = pack(pairsOf(graph.n).map(([u, v]) => hasEdge(graph, u, v)));
  const lit = pack(graph.edges.map(([u, v]) => isMatchedEdge(matching, u, v)));
  return encodeBase64Url(new Uint8Array([VERSION, graph.n, ...vines, ...lit]));
}

/** The garden behind a code, or why the code is not one. */
export function decodeGarden(code: string): Result<CodedGarden, GardenCodeError> {
  const decoded = decodeBase64Url(code);
  if (!decoded.ok) return err({ code: 'badText', error: decoded.error });
  const bytes = decoded.value;
  if (bytes.length < 2) return err({ code: 'truncated' });
  const version = bytes[0] as number;
  if (version !== VERSION) return err({ code: 'unknownVersion', version });

  const n = bytes[1] as number;
  const pairs = pairsOf(n);
  const vineEnd = 2 + Math.ceil(pairs.length / 8);
  if (bytes.length < vineEnd) return err({ code: 'truncated' });
  const vineBits = unpack(bytes.subarray(2, vineEnd), pairs.length);
  if (vineBits === null) return err({ code: 'strayBits' });
  const graph = unwrap(
    createGraph(
      n,
      pairs.filter((_, k) => vineBits[k]),
    ),
  );

  const litEnd = vineEnd + Math.ceil(graph.edges.length / 8);
  if (bytes.length < litEnd) return err({ code: 'truncated' });
  if (bytes.length > litEnd) return err({ code: 'trailingData' });
  const litBits = unpack(bytes.subarray(vineEnd, litEnd), graph.edges.length);
  if (litBits === null) return err({ code: 'strayBits' });
  const matching = createMatching(
    graph,
    graph.edges.filter((_, k) => litBits[k]),
  );
  if (!matching.ok) return err({ code: 'badLanterns', error: matching.error });
  return ok({ graph, matching: matching.value });
}
