import { decodeGarden } from '@core/codes/gardenCode';
import { err, ok, type Result } from '@core/shared/result';
import { itemAt } from '@core/shared/itemAt';
import { loadLevel } from '../loader';
import {
  limitBreach,
  type Design,
  type DesignPair,
  type DesignSprout,
  type LimitBreach,
} from './design';
import { layoutGarden } from './layout';
import { MAX_SPROUTS, MAX_VINES } from './limits';
import { LETTERS } from './names';

/**
 * A text pasted or a file chosen in the free mode (plan 08, phase 8), read as a design: first as
 * the JSON of a level (the free mode's own export, or any level of the catalog), held to the same
 * schema and garden builder as the catalog; otherwise as a garden code, which carries no places nor
 * names, so its sprouts are laid out anew and named A, B, C… Either way the garden must keep the
 * limits of the free mode. Nothing in the text is ever run: it is only parsed and checked.
 */

/** The longest text read, in characters; a longer one is refused before it is parsed. */
export const MAX_IMPORT_LENGTH = 64 * 1024;

/** Why a text is not a garden the free mode can take; the share sheet says each one kindly. */
export type ImportRejection = 'tooLong' | 'badJson' | 'badLevel' | 'badCode' | LimitBreach;

/** A design held to the limits of the free mode. */
const withinLimits = (design: Design): Result<Design, ImportRejection> => {
  const breach = limitBreach(design);
  return breach === null ? ok(design) : err(breach);
};

/** The garden of a parsed level file: its sprouts with their places, vines and lanterns. */
function fromLevelJson(json: unknown): Result<Design, ImportRejection> {
  const loaded = loadLevel(json);
  if (!loaded.ok) return err('badLevel');
  const { sprouts, vines, lanterns } = loaded.value.data;
  return withinLimits({
    sprouts: sprouts.map(({ label, x, y, kind }): DesignSprout =>
      kind === undefined ? { label, x, y } : { label, x, y, kind },
    ),
    vines: vines.map(([u, v]): DesignPair => [u, v]),
    lanterns: lanterns.map(([u, v]): DesignPair => [u, v]),
  });
}

/** The garden of a garden code, laid out by distance from its first sprout and named in order. */
function fromCode(code: string): Result<Design, ImportRejection> {
  const decoded = decodeGarden(code);
  if (!decoded.ok) return err('badCode');
  const { graph, matching } = decoded.value;
  if (graph.n > MAX_SPROUTS) return err('tooMany');
  if (graph.edges.length > MAX_VINES) return err('tooManyVines');
  const name = (vertex: number): string => itemAt(LETTERS, vertex);
  const spots = layoutGarden(graph, { kind: 'layers' });
  return withinLimits({
    sprouts: spots.map(({ x, y }, vertex) => ({ label: name(vertex), x, y })),
    vines: graph.edges.map(([u, v]): DesignPair => [name(u), name(v)]),
    lanterns: graph.edges
      .filter(([u, v]) => matching.mate[u] === v)
      .map(([u, v]): DesignPair => [name(u), name(v)]),
  });
}

/** The design a text holds, or why it holds none. */
export function importText(text: string): Result<Design, ImportRejection> {
  if (text.length > MAX_IMPORT_LENGTH) return err('tooLong');
  const trimmed = text.trim();
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    // Not JSON: a garden code, unless it plainly meant to be a level file.
    return /^[[{]/.test(trimmed) ? err('badJson') : fromCode(trimmed);
  }
  // A bare number or word parses as JSON too, but only an object or a list can be a level.
  return typeof json === 'object' && json !== null ? fromLevelJson(json) : fromCode(trimmed);
}
