import type { VertexId } from '@core/graph/types';

/**
 * The names of sprouts and flowers as the teacher's panel writes them in TeX (plan 07, phase 12),
 * with the conventions of the Codex: a vertex is an italic letter ($R$, $a$), a letter with digits
 * takes them as its index ($a_{1}$), and the i-th contraction of a search is the blossom $B_{i}$
 * (Definition 9.1). Any other name is set upright as text, with every character TeX gives a meaning
 * escaped, so no name a level may carry can break a formula.
 */

/** The characters TeX gives a meaning in text, and how each is written to stand for itself. */
const ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  _: '\\_',
  '^': '\\textasciicircum{}',
  '#': '\\#',
  '%': '\\%',
  '&': '\\&',
  $: '\\$',
  '~': '\\textasciitilde{}',
};

/** A name of one ASCII letter or digits only: written as it is, in math italic. */
const PLAIN = /^(?:[A-Za-z]|\d+)$/;
/** A name of one ASCII letter and then digits: the digits become its index. */
const INDEXED = /^([A-Za-z])(\d+)$/;

/** The name of a sprout in TeX. */
export function texName(name: string): string {
  if (PLAIN.test(name)) return name;
  if (INDEXED.test(name)) return name.replace(INDEXED, '$1_{$2}');
  return `\\text{${[...name].map((char) => ESCAPES[char] ?? char).join('')}}`;
}

/** The flower folded with id `id`: $B_{id}$. */
export const flowerName = (id: number): string => `B_{${id}}`;

/** The name of sprout `v` among `names`, by its id when it has none. */
const nameIn = (names: readonly string[], v: VertexId): string => texName(names[v] ?? String(v));

/** The vine `uv`, written as the Codex writes an edge: the two names side by side. */
export const texEdge = (names: readonly string[], u: VertexId, v: VertexId): string =>
  `${nameIn(names, u)}${nameIn(names, v)}`;

/** A path or a cycle, its sprouts in order with a thin space between them ($Z\,C\,D\,T$). */
export const texPath = (names: readonly string[], path: readonly VertexId[]): string =>
  path.map((v) => nameIn(names, v)).join('\\,');

/** A set of sprouts in the order given, or $\emptyset$. */
export const texSet = (names: readonly string[], set: readonly VertexId[]): string =>
  set.length === 0 ? '\\emptyset' : `\\{${set.map((v) => nameIn(names, v)).join(',')}\\}`;
