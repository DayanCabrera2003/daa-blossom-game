import type { VertexId } from '../graph/types';

/**
 * What the algorithm did, one event at a time. The trace is the single source for everything the
 * game replays: the sun slider, the mechanical gardener, the races against Bruto, the cost chart
 * and the teacher panel. Events are plain data so a trace can be stored, compared and replayed.
 *
 * Events always name original sprouts (and flowers by their id), never the ids of a folded garden,
 * which change with every fold: a trace must mean the same thing however it is replayed.
 */
export type TraceEvent =
  /** A search begins: every sprout in the dark becomes the root of its own tree. */
  | { readonly type: 'searchStart'; readonly roots: readonly VertexId[] }
  /** A sprout gets a sun (outer, even distance to its root). Roots have no parent. */
  | {
      readonly type: 'labelOuter';
      readonly vertex: VertexId;
      readonly parent: VertexId | null;
      readonly root: VertexId;
    }
  /** A sprout gets a moon (inner, odd distance), reached from a sun along a dark vine. */
  | {
      readonly type: 'labelInner';
      readonly vertex: VertexId;
      readonly parent: VertexId;
      readonly root: VertexId;
    }
  /** A sun looks along one of its vines (the unit of work of a search, Códex C4). */
  | { readonly type: 'scanEdge'; readonly from: VertexId; readonly to: VertexId }
  /** A vine joins two suns of the same tree: a flower has been found (level 4.2). */
  | { readonly type: 'oddCycleFound'; readonly vine: readonly [VertexId, VertexId] }
  /** The flower is folded into one node, a sun (level 4.4). `cycle` starts at the base child. */
  | {
      readonly type: 'contract';
      readonly blossom: number;
      readonly base: VertexId;
      readonly cycle: readonly NodeRef[];
    }
  /** A flower the chain crosses is opened again, outer flowers before inner ones (4.5, 5.1). */
  | { readonly type: 'expand'; readonly blossom: number }
  /** A chain was found and its lanterns passed along, root to root. */
  | { readonly type: 'augment'; readonly path: readonly VertexId[] }
  /** The forest stopped growing without a chain: the current matching is the best (Berge). */
  | { readonly type: 'searchFailed' }
  /** The algorithm finished with this many lanterns lit. */
  | { readonly type: 'done'; readonly size: number };

/** A child of a flower, named stably: an original sprout or an earlier flower by its id. */
export type NodeRef =
  | { readonly kind: 'sprout'; readonly vertex: VertexId }
  | { readonly kind: 'blossom'; readonly id: number };

/** The tag of a trace event. */
export type TraceEventType = TraceEvent['type'];
