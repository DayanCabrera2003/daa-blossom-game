import { invariant } from '../shared/invariant';
import { err, ok, type Result } from '../shared/result';
import type { Edge, VertexId } from './types';

/**
 * Human-facing names of sprouts (`R`, `a`, `b`, …), as written in the design document and level
 * files. Names are presentation only: the algorithm works on dense ids, and a name maps to the id
 * given by its position in the list.
 */
export interface Labels {
  readonly names: readonly string[];
  readonly ids: ReadonlyMap<string, VertexId>;
}

export type LabelError =
  | { readonly code: 'emptyName'; readonly index: number }
  | { readonly code: 'duplicateName'; readonly name: string }
  | { readonly code: 'unknownName'; readonly name: string };

/** Builds the name ↔ id mapping; names must be non-empty and unique. */
export function createLabels(names: readonly string[]): Result<Labels, LabelError> {
  const ids = new Map<string, VertexId>();
  for (const [index, name] of names.entries()) {
    if (name.length === 0) return err({ code: 'emptyName', index });
    if (ids.has(name)) return err({ code: 'duplicateName', name });
    ids.set(name, index);
  }
  return ok({ names, ids });
}

/** The id of a named sprout, or `undefined` if no sprout has that name. */
export function idOf(labels: Labels, name: string): VertexId | undefined {
  return labels.ids.get(name);
}

/** The name of a sprout; asking for an id outside the labels is a bug. */
export function nameOf(labels: Labels, id: VertexId): string {
  const name = labels.names[id];
  invariant(name !== undefined, `no label for vertex ${id}`);
  return name;
}

/** Translates vines written with names (e.g. `['R', 'a']`) into id edges, keeping orientation. */
export function toEdges(
  labels: Labels,
  vines: readonly (readonly [string, string])[],
): Result<Edge[], LabelError> {
  const edges: Edge[] = [];
  for (const [from, to] of vines) {
    const u = idOf(labels, from);
    if (u === undefined) return err({ code: 'unknownName', name: from });
    const v = idOf(labels, to);
    if (v === undefined) return err({ code: 'unknownName', name: to });
    edges.push([u, v]);
  }
  return ok(edges);
}
