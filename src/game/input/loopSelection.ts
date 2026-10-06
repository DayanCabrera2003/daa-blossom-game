import type { VertexId } from '@core/graph/types';

/** The loop being chosen after one more touch, and the finished loop if that touch closed it. */
export interface LoopStep {
  readonly vertices: readonly VertexId[];
  readonly closed: readonly VertexId[] | null;
}

/**
 * One touch while choosing a loop to fold (level 4.4): sprouts are added in order and the loop
 * closes on its first sprout once it has three. Touching the last sprout again takes it back, so
 * a slip is undone without starting over. Whether the loop is a flower is for the rules to say.
 */
export function extendLoop(vertices: readonly VertexId[], vertex: VertexId): LoopStep {
  if (vertices.length >= 3 && vertex === vertices[0]) return { vertices: [], closed: vertices };
  if (vertex === vertices[vertices.length - 1]) {
    return { vertices: vertices.slice(0, -1), closed: null };
  }
  if (vertices.includes(vertex)) return { vertices, closed: null };
  return { vertices: [...vertices, vertex], closed: null };
}
