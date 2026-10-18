import type { NodeRef, TraceEvent, TraceEventType } from '@core/trace/events';
import type { NotationKey } from './notationKeys';
import { flowerName, texEdge, texName, texPath, texSet } from './texName';

/**
 * The trace of a day in mathematical notation, for the teacher's panel (GDD §5.8; plan 07, phase
 * 12): each event, of the algorithm or of the player, as one line of TeX in the very symbols of the
 * Codex: $G$, $M$, $G'$ and $M'$ (Algorithm 10.1), the forest's $O$, $I$, $r$ and $p$ (Definition
 * 4.1), the blossoms $B_i$ of the contractions (Definition 9.1) with their original base $\beta$,
 * and $M\oplus E(P)$ for an augmentation (Definition 2.2). The words around the symbols are
 * templates of `content/<locale>/notation.json`; this module only picks one and fills its gaps.
 */

/** The templates of one locale, by key (`notation.json`). */
export type Notation = Readonly<Record<string, string>>;

/** One line of a trace: the moment it leads to (1 after the first event), its kind and its TeX. */
export interface NotationLine {
  readonly step: number;
  readonly type: TraceEventType;
  readonly tex: string;
}

/**
 * The template `key` with each of `gaps` filled. Only the gaps named are touched, so the groups of
 * TeX in a template (`B_{i}`, `\text{…}`) stay as written; a missing template shows its key as text.
 */
export function fillNotation(
  notation: Notation,
  key: string,
  gaps: Readonly<Record<string, string | number>>,
): string {
  const template = notation[key];
  if (template === undefined) return `\\text{‹${key}›}`;
  return template.replace(/\{(\w+)\}/g, (whole, gap: string) =>
    gap in gaps ? String(gaps[gap]) : whole,
  );
}

/** The TeX of one event, sprouts named by `names`. */
export function eventTex(event: TraceEvent, names: readonly string[], notation: Notation): string {
  const fill = (key: NotationKey, gaps: Readonly<Record<string, string | number>> = {}): string =>
    fillNotation(notation, key, gaps);
  const name = (v: number): string => texName(names[v] ?? String(v));
  const node = (ref: NodeRef): string =>
    ref.kind === 'sprout' ? name(ref.vertex) : flowerName(ref.id);
  switch (event.type) {
    case 'searchStart':
      return event.roots.length === 0
        ? fill('searchStartNone')
        : fill('searchStart', { roots: texSet(names, event.roots) });
    case 'labelOuter':
      return event.parent === null
        ? fill('labelRoot', { v: name(event.vertex) })
        : fill('labelOuter', {
            v: name(event.vertex),
            parent: name(event.parent),
            root: name(event.root),
          });
    case 'labelInner':
      return fill('labelInner', {
        v: name(event.vertex),
        parent: name(event.parent),
        root: name(event.root),
      });
    case 'scanEdge':
      return fill('scanEdge', { edge: texEdge(names, event.from, event.to) });
    case 'oddCycleFound':
      return fill('oddCycleFound', { edge: texEdge(names, event.vine[0], event.vine[1]) });
    case 'contract': {
      // The cycle closed at its first child, the one holding the base: B = Y_0 Y_1 … Y_2h Y_0.
      const cycle = [...event.cycle, ...event.cycle.slice(0, 1)].map(node).join('\\,');
      return fill('contract', {
        flower: flowerName(event.blossom),
        cycle,
        base: name(event.base),
      });
    }
    case 'expand':
      return fill('expand', { flower: flowerName(event.blossom) });
    case 'augment':
    case 'chainFound':
      return fill(event.type, { path: texPath(names, event.path) });
    case 'searchFailed':
    case 'searchCleared':
    case 'declareDone':
      return fill(event.type);
    case 'done':
      return fill('done', { size: event.size });
    case 'light':
    case 'putOut':
      return fill(event.type, { edge: texEdge(names, event.u, event.v) });
    case 'inspect':
      return fill('inspect', { v: name(event.vertex), set: texSet(names, event.vines) });
    case 'scarecrow':
      return fill(event.placed ? 'scarecrowPlaced' : 'scarecrowRemoved', {
        v: name(event.vertex),
      });
    case 'stone':
      return fill(event.lifted ? 'stoneLifted' : 'stoneDropped', { v: name(event.vertex) });
  }
}

/** Every event of `trace` as a numbered line: the k-th leads to the moment k of `stateAt`. */
export const traceLines = (
  trace: readonly TraceEvent[],
  names: readonly string[],
  notation: Notation,
): NotationLine[] =>
  trace.map((event, k) => ({
    step: k + 1,
    type: event.type,
    tex: eventTex(event, names, notation),
  }));
