import type { VertexId } from '../graph/types';
import { err, ok, type Result } from '../shared/result';

/** Why a sprout cannot be added to or removed from a set of placed objects. */
export type SproutSetError =
  | { readonly code: 'alreadyPlaced'; readonly vertex: VertexId }
  | { readonly code: 'notPlaced'; readonly vertex: VertexId };

/**
 * Sets of sprouts carrying an object (scarecrows, stones) are kept sorted, so two gardens with the
 * same objects compare equal however they were placed. These return a new set, never mutate.
 */
export function withSprout(
  set: readonly VertexId[],
  vertex: VertexId,
): Result<VertexId[], SproutSetError> {
  if (set.includes(vertex)) return err({ code: 'alreadyPlaced', vertex });
  return ok([...set, vertex].sort((a, b) => a - b));
}

/** The set without `vertex`, which must be in it. */
export function withoutSprout(
  set: readonly VertexId[],
  vertex: VertexId,
): Result<VertexId[], SproutSetError> {
  if (!set.includes(vertex)) return err({ code: 'notPlaced', vertex });
  return ok(set.filter((v) => v !== vertex));
}
