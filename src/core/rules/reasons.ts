import type { BlossomError } from '../blossom/isBlossom';
import type { VertexId } from '../graph/types';
import type { PathError } from '../matching/paths';
import type { ActionType } from './actions';

/**
 * Why an action was not applied. Codes are stable: the game turns each one into gentle feedback or
 * a hint, never a punishment (GDD §1.3, "sin castigo"), and the fields say what to highlight.
 */
export type RejectReason =
  | { readonly code: 'actionLocked'; readonly action: ActionType }
  /** Unlocked by now, but closed by this level for the day (4.10 closes folding). */
  | { readonly code: 'actionClosed'; readonly action: ActionType }
  | { readonly code: 'vertexOutOfRange'; readonly vertex: number }
  | { readonly code: 'notAdjacent'; readonly u: VertexId; readonly v: VertexId }
  | { readonly code: 'alreadyLit'; readonly vertex: VertexId }
  | { readonly code: 'notLit'; readonly u: VertexId; readonly v: VertexId }
  | { readonly code: 'notInTheDark'; readonly vertex: VertexId }
  | { readonly code: 'notARoot'; readonly vertex: VertexId }
  | { readonly code: 'noLanternToPass'; readonly vertex: VertexId }
  | { readonly code: 'flowersFolded' }
  | { readonly code: 'invalidPath'; readonly error: PathError }
  | { readonly code: 'noFog' }
  | { readonly code: 'alreadyInspected'; readonly vertex: VertexId }
  | { readonly code: 'vineHidden'; readonly vertex: VertexId }
  | { readonly code: 'notASun'; readonly vertex: VertexId }
  | { readonly code: 'litVine'; readonly u: VertexId; readonly v: VertexId }
  | { readonly code: 'insideOneFlower'; readonly u: VertexId; readonly v: VertexId }
  | { readonly code: 'alreadyMarked'; readonly vertex: VertexId }
  | { readonly code: 'sunMeetsSun'; readonly u: VertexId; readonly v: VertexId }
  | { readonly code: 'notSunsOfOneTree'; readonly u: VertexId; readonly v: VertexId }
  | { readonly code: 'searchInProgress' }
  | { readonly code: 'notAFlower'; readonly error: BlossomError }
  | { readonly code: 'noSuchFlower'; readonly blossom: number }
  | { readonly code: 'alreadyPlaced'; readonly vertex: VertexId }
  | { readonly code: 'notPlaced'; readonly vertex: VertexId }
  /** The level only lets lanterns move along the chain the marks reached (`chainRule.ts`). */
  | { readonly code: 'chainNotSeen' }
  /** The level's flower is closed: a chain only goes round it from its base (`chainRule.ts`). */
  | { readonly code: 'flowerClosed' }
  /** The light stopped where two suns of one tree meet, along `u`–`v`: fold to go on. */
  | { readonly code: 'lightAtFlower'; readonly u: VertexId; readonly v: VertexId }
  /** The light has seen a chain, which waits to be lit. */
  | { readonly code: 'lightFound' }
  /** The light has nothing left to look at. */
  | { readonly code: 'lightDone' };

/** The stable code of a rejection. */
export type RejectCode = RejectReason['code'];
