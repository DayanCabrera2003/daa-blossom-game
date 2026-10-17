import { openLayer } from '../blossom/contract';
import type { Layer } from '../blossom/types';
import type { Graph, VertexId } from '../graph/types';
import { emptyMatching } from '../matching/createMatching';
import type { Matching } from '../matching/types';
import type { AlternatingForest } from '../search/forest';
import type { ActionType } from './actions';

/**
 * Everything the rules need to know about a garden being played. Immutable: every accepted action
 * returns a new state, so undo/redo is just a history of states (`game/systems`).
 */
export interface GardenState {
  /** The original garden. */
  readonly graph: Graph;
  /** The lanterns, always on original sprouts. */
  readonly matching: Matching;
  /** The garden as the player sees it, with folded flowers (`openLayer` when nothing is folded). */
  readonly layer: Layer;
  /** The player's suns and moons, on the ids of `layer`; null until a search starts. */
  readonly search: AlternatingForest | null;
  /** Sprouts whose vines the fog no longer hides; null when the level has no fog. */
  readonly revealed: readonly boolean[] | null;
  /** Drops of water spent inspecting: a star condition, never a limit (GDD §5.4). */
  readonly waterUsed: number;
  readonly scarecrows: readonly VertexId[];
  readonly stones: readonly VertexId[];
  /** The last chain the marks reached, on original sprouts, until the lanterns change. */
  readonly chainSeen: readonly VertexId[] | null;
  readonly declaredDone: boolean;
  /** The actions this level unlocks. */
  readonly allowed: ReadonlySet<ActionType>;
  /**
   * The only sprouts a search may start from (a level's `roots`, 4.1: "from R"), or null when any
   * sprout in the dark may.
   */
  readonly roots: readonly VertexId[] | null;
}

/** How a level sets up its garden. */
export interface GardenSetup {
  readonly graph: Graph;
  /** Starting lanterns; a garden in the dark by default. */
  readonly matching?: Matching;
  /** Whether the garden starts covered in fog (chapter 3). */
  readonly fog?: boolean;
  readonly allowed: readonly ActionType[];
  /** The only sprouts a search may start from; any sprout in the dark by default. */
  readonly roots?: readonly VertexId[];
}

/** The garden at the start of a level: open, unmarked, nothing spent or placed. */
export function createGardenState(setup: GardenSetup): GardenState {
  const matching = setup.matching ?? emptyMatching(setup.graph);
  return {
    graph: setup.graph,
    matching,
    layer: openLayer(setup.graph, matching),
    search: null,
    revealed: setup.fog === true ? new Array<boolean>(setup.graph.n).fill(false) : null,
    waterUsed: 0,
    scarecrows: [],
    stones: [],
    chainSeen: null,
    declaredDone: false,
    allowed: new Set(setup.allowed),
    roots: setup.roots ?? null,
  };
}
