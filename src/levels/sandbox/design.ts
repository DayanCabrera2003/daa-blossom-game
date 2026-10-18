import { err, ok, type Result } from '@core/shared/result';
import { SPROUT_AREA, type SproutKind } from '../fields';
import { MAX_SPROUTS, MAX_VINES, MIN_SPACING } from './limits';
import { nextName } from './names';

/**
 * A garden of the free mode as the player designs it (plan 08, phase 8), and the pure reducer of
 * its edits. A design is written like the garden of a level file (sprouts by name, with where they
 * sit; vines and lanterns between names), so turning it into a level is a copy. Every edit returns
 * the new design or why it is refused, and no edit ever takes a design out of its limits.
 */

/** A sprout of a design: its name, where it sits, and bee or flower in such a garden only. */
export interface DesignSprout {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly kind?: SproutKind;
}

/** A vine, or the lantern on it, between two named sprouts. */
export type DesignPair = readonly [string, string];

/** A garden being designed. */
export interface Design {
  readonly sprouts: readonly DesignSprout[];
  readonly vines: readonly DesignPair[];
  readonly lanterns: readonly DesignPair[];
}

/** The design with nothing in it, where the free mode starts and where "clear" goes back to. */
export const EMPTY_DESIGN: Design = { sprouts: [], vines: [], lanterns: [] };

/** One edit of the design, as the editor's tools ask for it. */
export type DesignEdit =
  | { readonly type: 'addSprout'; readonly x: number; readonly y: number }
  | { readonly type: 'moveSprout'; readonly label: string; readonly x: number; readonly y: number }
  | { readonly type: 'removeSprout'; readonly label: string }
  | { readonly type: 'toggleVine'; readonly u: string; readonly v: string }
  | { readonly type: 'toggleLantern'; readonly u: string; readonly v: string }
  | { readonly type: 'clear' };

/** Why an edit is refused; the editor says each one kindly. */
export type DesignRejection =
  | 'tooMany'
  | 'tooClose'
  | 'outside'
  | 'tooManyVines'
  | 'sproutBusy'
  | 'notAVine'
  | 'noSprout'
  | 'sameSprout';

/** Whether a pair joins the two sprouts `u` and `v`, in either order. */
const joins = (pair: DesignPair, u: string, v: string): boolean =>
  (pair[0] === u && pair[1] === v) || (pair[0] === v && pair[1] === u);

/** Whether a point is inside the area where sprouts may sit. */
const inside = (x: number, y: number): boolean =>
  x >= SPROUT_AREA.x0 && x <= SPROUT_AREA.x1 && y >= SPROUT_AREA.y0 && y <= SPROUT_AREA.y1;

/** Whether a point is closer than the least spacing to one of `sprouts`. */
const crowded = (sprouts: readonly DesignSprout[], x: number, y: number): boolean =>
  sprouts.some((sprout) => Math.hypot(sprout.x - x, sprout.y - y) < MIN_SPACING);

/** The design's sprouts as sprouts of a plain garden, neither bees nor flowers. */
const plain = (sprouts: readonly DesignSprout[]): DesignSprout[] =>
  sprouts.map(({ label, x, y }) => ({ label, x, y }));

/** The sprout named `label`, if the design has it. */
const sproutNamed = (design: Design, label: string): DesignSprout | undefined =>
  design.sprouts.find((sprout) => sprout.label === label);

/**
 * The first limit a design breaks, or null when it keeps them all: no more than 24 sprouts and 40
 * vines, every sprout inside the garden, and no two of them closer than 18 px. An imported design
 * is held to them as an edited one is.
 */
export function limitBreach(design: Design): DesignRejection | null {
  const { sprouts } = design;
  if (sprouts.length > MAX_SPROUTS) return 'tooMany';
  if (design.vines.length > MAX_VINES) return 'tooManyVines';
  if (sprouts.some(({ x, y }) => !inside(x, y))) return 'outside';
  if (sprouts.some(({ x, y }, i) => crowded(sprouts.slice(i + 1), x, y))) return 'tooClose';
  return null;
}

/** Adds a sprout where the grass is touched, rounded to a pixel, named with the next letter. */
function addSprout(design: Design, at: { x: number; y: number }): Result<Design, DesignRejection> {
  const [x, y] = [Math.round(at.x), Math.round(at.y)];
  const label = nextName(design.sprouts.map((sprout) => sprout.label));
  if (design.sprouts.length >= MAX_SPROUTS || label === null) return err('tooMany');
  if (!inside(x, y)) return err('outside');
  if (crowded(design.sprouts, x, y)) return err('tooClose');
  // A sprout added by hand is neither bee nor flower, so the garden stops being one of them.
  const kinded = design.sprouts.some((sprout) => sprout.kind !== undefined);
  const sprouts = kinded ? plain(design.sprouts) : design.sprouts;
  return ok({ ...design, sprouts: [...sprouts, { label, x, y }] });
}

/** Moves a sprout, rounded to a pixel, as long as it stays inside and apart from the others. */
function moveSprout(
  design: Design,
  edit: Extract<DesignEdit, { type: 'moveSprout' }>,
): Result<Design, DesignRejection> {
  const sprout = sproutNamed(design, edit.label);
  if (sprout === undefined) return err('noSprout');
  const [x, y] = [Math.round(edit.x), Math.round(edit.y)];
  if (!inside(x, y)) return err('outside');
  const others = design.sprouts.filter((other) => other !== sprout);
  if (crowded(others, x, y)) return err('tooClose');
  return ok({
    ...design,
    sprouts: design.sprouts.map((other) => (other === sprout ? { ...sprout, x, y } : other)),
  });
}

/** Takes a sprout away, with its vines and their lanterns. */
function removeSprout(design: Design, label: string): Result<Design, DesignRejection> {
  if (sproutNamed(design, label) === undefined) return err('noSprout');
  const keep = (pair: DesignPair): boolean => !pair.includes(label);
  return ok({
    sprouts: design.sprouts.filter((sprout) => sprout.label !== label),
    vines: design.vines.filter(keep),
    lanterns: design.lanterns.filter(keep),
  });
}

/** Grows a vine between two sprouts, or takes it away (and its lantern) if it is there. */
function toggleVine(design: Design, u: string, v: string): Result<Design, DesignRejection> {
  const [a, b] = [sproutNamed(design, u), sproutNamed(design, v)];
  if (a === undefined || b === undefined) return err('noSprout');
  if (u === v) return err('sameSprout');
  if (design.vines.some((vine) => joins(vine, u, v))) {
    return ok({
      ...design,
      vines: design.vines.filter((vine) => !joins(vine, u, v)),
      lanterns: design.lanterns.filter((lantern) => !joins(lantern, u, v)),
    });
  }
  if (design.vines.length >= MAX_VINES) return err('tooManyVines');
  // A vine between two bees, or two flowers, makes the garden one like any other.
  const clash = a.kind !== undefined && a.kind === b.kind;
  const sprouts = clash ? plain(design.sprouts) : design.sprouts;
  return ok({ ...design, sprouts, vines: [...design.vines, [u, v]] });
}

/** Lights a vine, or puts its lantern out; a sprout never holds two lanterns. */
function toggleLantern(design: Design, u: string, v: string): Result<Design, DesignRejection> {
  const vine = design.vines.find((pair) => joins(pair, u, v));
  if (vine === undefined) return err('notAVine');
  if (design.lanterns.some((lantern) => joins(lantern, u, v))) {
    return ok({
      ...design,
      lanterns: design.lanterns.filter((lantern) => !joins(lantern, u, v)),
    });
  }
  if (design.lanterns.some((lantern) => lantern.includes(u) || lantern.includes(v))) {
    return err('sproutBusy');
  }
  return ok({ ...design, lanterns: [...design.lanterns, vine] });
}

/** Applies one edit to a design: the new design, or why the edit is refused. */
export function editDesign(design: Design, edit: DesignEdit): Result<Design, DesignRejection> {
  switch (edit.type) {
    case 'addSprout':
      return addSprout(design, edit);
    case 'moveSprout':
      return moveSprout(design, edit);
    case 'removeSprout':
      return removeSprout(design, edit.label);
    case 'toggleVine':
      return toggleVine(design, edit.u, edit.v);
    case 'toggleLantern':
      return toggleLantern(design, edit.u, edit.v);
    case 'clear':
      return ok(EMPTY_DESIGN);
  }
}
