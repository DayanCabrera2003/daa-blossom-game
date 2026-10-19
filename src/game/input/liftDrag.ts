import type { VertexId } from '@core/graph/types';
import { checkAlternatingPath } from '@core/matching/paths';
import { isExposed } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { requireVisibleVines } from '@core/rules/checks';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import { gapOpen, type FoundChain, type Gap } from '../systems/liftGaps';

/**
 * The gesture of lifting (GDD §5.1, "El gesto de levantar"; plan 10, phase 2). Once the light has
 * found a chain and the flowers it crossed are open, the found stretches stay drawn and each gap
 * inside a flower is filled by a drag of its own, from one of its ends (the petal the chain entered
 * by, or the base). With every gap filled the whole chain is composed (found stretches and fills)
 * and sent as the usual `chain` move, so the rules judge it as any other. Dragging the whole chain
 * from one end still works: a drag from a sprout in the dark that goes beyond the gap is a chain.
 */

/** A stretch dragged into a gap: the gap it fills and its sprouts, in the chain's order. */
export interface Fill {
  readonly gap: Gap;
  readonly path: readonly VertexId[];
}

/** The gaps filled so far, and the found chain they belong to (null: none filled). */
export interface LiftFills {
  readonly chain: readonly VertexId[] | null;
  readonly fills: readonly Fill[];
}

/** No gap filled. */
export const NO_FILLS: LiftFills = { chain: null, fills: [] };

/** A drag into a gap after one more move, why that move was refused, and the chain it tried. */
export interface LiftStep {
  readonly path: readonly VertexId[];
  readonly rejection: RejectReason | null;
  /** The sprouts the refused move tried, the found sprout before the gap first: the toast's names. */
  readonly tried: readonly VertexId[];
}

/** What letting go of a drag in a garden with gaps does. */
export type LiftRelease =
  /** Not a drag into a gap: a chain from a sprout in the dark is applied as always. */
  | { readonly kind: 'notLift' }
  /** A gap filled, with others still to fill. */
  | { readonly kind: 'filled'; readonly fills: LiftFills }
  /** The last gap filled: the whole chain, composed, to apply. */
  | { readonly kind: 'composed'; readonly action: Action; readonly fills: LiftFills }
  /** A gap filled the wrong way: refused at once, with the reason of the rules and what it tried. */
  | { readonly kind: 'refused'; readonly reason: RejectReason; readonly action: Action };

/** The gaps of `found` open in `state`, those whose stretch can be dragged now. */
const openGaps = (found: FoundChain, state: GardenState): Gap[] =>
  found.gaps.filter((gap) => gapOpen(state, found.chain, gap));

/** The ends of a gap: its first and last sprouts. */
const endsOf = (found: FoundChain, gap: Gap): readonly [VertexId, VertexId] => [
  itemAt(found.chain, gap.from),
  itemAt(found.chain, gap.to),
];

/** The found sprout just outside the gap at its end `end`, if the chain goes on past it. */
function outsideOf(found: FoundChain, gap: Gap, end: VertexId): VertexId | null {
  const position = end === itemAt(found.chain, gap.from) ? gap.from - 1 : gap.to + 1;
  return found.chain[position] ?? null;
}

/** The open gap that starts or ends at `vertex`, if there is one. */
function gapAt(found: FoundChain, state: GardenState, vertex: VertexId): Gap | null {
  return openGaps(found, state).find((gap) => endsOf(found, gap).includes(vertex)) ?? null;
}

/**
 * Whether a press on `vertex` starts a drag into a gap: a lit end of an open gap. An end in the dark
 * (the base at the end of the chain, 5.1) starts a chain as always, which becomes a fill if it stops
 * at the gap's other end.
 */
export function startsLift(
  found: FoundChain | null,
  state: GardenState,
  vertex: VertexId,
): boolean {
  if (found === null || isExposed(state.matching, vertex)) return false;
  return gapAt(found, state, vertex) !== null;
}

/**
 * Moves a drag into a gap onto `vertex`. Only the petals of the gap's flower can be reached (a
 * move elsewhere leaves it put); going back over the last step takes it back; any other move is
 * checked for alternation together with the found sprout before the gap, so starting on the wrong
 * side is refused at once ("Cleo already has a lantern…", GDD 4.5).
 */
export function extendLift(
  found: FoundChain,
  state: GardenState,
  path: readonly VertexId[],
  vertex: VertexId,
): LiftStep {
  const start = path[0];
  const gap = start === undefined ? null : gapAt(found, state, start);
  const stay = { path, rejection: null, tried: path };
  if (start === undefined || gap === null || !gap.petals.includes(vertex)) return stay;
  if (vertex === path[path.length - 1]) return stay;
  if (vertex === path[path.length - 2]) return { ...stay, path: path.slice(0, -1) };
  const outside = outsideOf(found, gap, start);
  const tried = [...(outside === null ? [] : [outside]), ...path, vertex];
  const hidden = requireVisibleVines(state, tried.slice(-2));
  if (hidden) return { path, rejection: hidden, tried };
  const checked = checkAlternatingPath(state.graph, state.matching, tried);
  if (!checked.ok) return { path, rejection: { code: 'invalidPath', error: checked.error }, tried };
  return { path: [...path, vertex], rejection: null, tried };
}

/** Whether two gaps are the same stretch of the chain (gaps are read afresh at every look). */
const sameGap = (a: Gap, b: Gap): boolean => a.from === b.from && a.to === b.to;

/** The fills of `lift` that still count for `found` in `state`: same chain, gap still open. */
function liveFills(found: FoundChain, state: GardenState, lift: LiftFills): Fill[] {
  if (lift.chain !== found.chain) return [];
  const open = openGaps(found, state);
  return lift.fills.filter((fill) => open.some((gap) => sameGap(gap, fill.gap)));
}

/** The whole chain: the found stretches, with each gap replaced by its fill. */
function compose(found: FoundChain, fills: readonly Fill[]): VertexId[] {
  const chain: VertexId[] = [];
  let next = 0;
  for (const fill of [...fills].sort((a, b) => a.gap.from - b.gap.from)) {
    chain.push(...found.chain.slice(next, fill.gap.from), ...fill.path);
    next = fill.gap.to + 1;
  }
  chain.push(...found.chain.slice(next));
  return chain;
}

/**
 * Letting go of the drag `path`. It fills a gap when it runs from one end of an open gap to the
 * other over the petals of its flower; otherwise it is no lift (`notLift`). The last gap filled
 * composes the whole chain to send as the `chain` move. A gap filled while others are still open is
 * checked for alternation with the found sprouts on both sides, so a wrong side is refused at once.
 */
export function releaseLift(
  found: FoundChain | null,
  state: GardenState,
  lift: LiftFills,
  path: readonly VertexId[],
): LiftRelease {
  const first = path[0];
  const last = path[path.length - 1];
  if (found === null || first === undefined || last === undefined || path.length < 2) {
    return { kind: 'notLift' };
  }
  const gap = gapAt(found, state, first);
  const fills = gap !== null && path.every((v) => gap.petals.includes(v));
  const [from, to] = gap === null ? [first, first] : endsOf(found, gap);
  if (gap === null || !fills || ![from, to].includes(last) || first === last) {
    return { kind: 'notLift' };
  }
  const ordered = first === from ? [...path] : [...path].reverse();
  const kept = liveFills(found, state, lift).filter((fill) => !sameGap(fill.gap, gap));
  const filled = [...kept, { gap, path: ordered }];
  const next: LiftFills = { chain: found.chain, fills: filled };
  if (filled.length === found.gaps.length) {
    return {
      kind: 'composed',
      action: { type: 'chain', path: compose(found, filled) },
      fills: next,
    };
  }
  const before = outsideOf(found, gap, from);
  const after = outsideOf(found, gap, to);
  const tried = [
    ...(before === null ? [] : [before]),
    ...ordered,
    ...(after === null ? [] : [after]),
  ];
  const checked = checkAlternatingPath(state.graph, state.matching, tried);
  if (!checked.ok) {
    return {
      kind: 'refused',
      reason: { code: 'invalidPath', error: checked.error },
      action: { type: 'chain', path: tried },
    };
  }
  return { kind: 'filled', fills: next };
}
