import { idOf, type LabelError, type Labels } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { err, ok, type Result } from '@core/shared/result';
import type { LevelAction } from './fields';

/*
 * Turns what a level file writes with sprout names into the same thing with sprout ids, as the
 * core works with ids only. An unknown name is reported, never guessed.
 */

const SPROUT_FIELDS = ['u', 'v', 'from', 'to', 'vertex'] as const;
const PATH_FIELDS = ['path', 'stem', 'loop'] as const;

/**
 * Translates one solution step from names to ids. Every action keeps its shape; only the fields
 * that name sprouts change, so the translation is done field by field. TypeScript cannot follow a
 * field-wise rewrite over a union, hence the single cast at the end, safe by construction.
 */
export function toAction(labels: Labels, step: LevelAction): Result<Action, LabelError> {
  const translated: Record<string, unknown> = { ...step };
  const id = (name: string): VertexId | LabelError =>
    idOf(labels, name) ?? { code: 'unknownName', name };
  for (const field of SPROUT_FIELDS) {
    const name = (step as Record<string, unknown>)[field];
    if (typeof name !== 'string') continue;
    const vertex = id(name);
    if (typeof vertex !== 'number') return err(vertex);
    translated[field] = vertex;
  }
  for (const field of PATH_FIELDS) {
    const names = (step as Record<string, unknown>)[field];
    if (!Array.isArray(names)) continue;
    const vertices: VertexId[] = [];
    for (const name of names as string[]) {
      const vertex = id(name);
      if (typeof vertex !== 'number') return err(vertex);
      vertices.push(vertex);
    }
    translated[field] = vertices;
  }
  return ok(translated as Action);
}
