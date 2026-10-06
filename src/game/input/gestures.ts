import { members } from '@core/blossom/hierarchy';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import { flowerOutline, interiorCandidates } from './flowerShape';
import { FLOWER_PADDING, hitTest } from './HitTest';
import { chooseTool, pressEnd, pressMove, pressStart, type PointerState } from './pointer';
import type { Point } from './target';
import { TOOL_ACTIONS, type ToolId } from './tools';

/**
 * What a player does with hand and mouse: take a tool, press and drag through some points (a
 * single point is a touch), or press "Terminé". Used to prove that every move of the rules can be
 * made on the canvas, through the very same pointer the level scene uses.
 */
export type Gesture =
  | { readonly kind: 'tool'; readonly tool: ToolId }
  | { readonly kind: 'press'; readonly points: readonly Point[] }
  | { readonly kind: 'done' };

const toolOf = (action: Action): ToolId => {
  const tool = (Object.keys(TOOL_ACTIONS) as ToolId[]).find((t) =>
    TOOL_ACTIONS[t].includes(action.type),
  );
  invariant(tool !== undefined, `no tool performs ${action.type}`);
  return tool;
};

/** A point on the vine u–v that a touch lands on: its middle, or the nearest spot along it that works. */
function vinePoint(
  state: GardenState,
  positions: readonly Point[],
  u: VertexId,
  v: VertexId,
): Point {
  const [a, b] = [positions[u] as Point, positions[v] as Point];
  const [lo, hi] = u < v ? [u, v] : [v, u];
  for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
    const point = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    const target = hitTest(state, positions, point);
    if (target.kind === 'vine' && target.u === lo && target.v === hi) return point;
  }
  throw new Error(`the vine ${u}–${v} cannot be touched: it is hidden by sprouts or other vines`);
}

/** A point inside a folded flower that lands on it and not on a petal or a vine. */
function flowerPoint(state: GardenState, positions: readonly Point[], blossom: number): Point {
  const flower = state.layer.nodes.find((node) => node.kind === 'blossom' && node.id === blossom);
  invariant(flower !== undefined, `flower ${blossom} is not folded on top`);
  const outline = flowerOutline(
    members(flower).map((v) => positions[v] as Point),
    FLOWER_PADDING,
  );
  const point = interiorCandidates(outline).find((candidate) => {
    const target = hitTest(state, positions, candidate);
    return target.kind === 'flower' && target.blossom === blossom;
  });
  if (point === undefined) throw new Error(`flower ${blossom} has no free spot to touch`);
  return point;
}

/** The gestures that perform `action` in the garden as it is now. */
export function gesturesFor(
  state: GardenState,
  positions: readonly Point[],
  action: Action,
): Gesture[] {
  if (action.type === 'declareDone') return [{ kind: 'done' }];
  const at = (v: VertexId): Point => positions[v] as Point;
  const touch = (point: Point): Gesture => ({ kind: 'press', points: [point] });
  const tool: Gesture = { kind: 'tool', tool: toolOf(action) };
  switch (action.type) {
    case 'join':
      return [tool, touch(at(action.u)), touch(at(action.v))];
    case 'passLantern':
    case 'markMoon':
      return [tool, touch(at(action.from)), touch(at(action.to))];
    case 'split':
      return [tool, touch(vinePoint(state, positions, action.u, action.v))];
    case 'foldAt':
      return [tool, touch(vinePoint(state, positions, action.from, action.to))];
    case 'chain':
      return [tool, { kind: 'press', points: action.path.map(at) }];
    case 'rotateStem':
      return [tool, { kind: 'press', points: action.stem.map(at) }];
    case 'fold':
      return [tool, ...[...action.loop, action.loop[0] as VertexId].map((v) => touch(at(v)))];
    case 'unfold':
      return [tool, touch(flowerPoint(state, positions, action.blossom))];
    case 'inspect':
    case 'markRoot':
    case 'placeScarecrow':
    case 'removeScarecrow':
    case 'liftStone':
    case 'dropStone':
      return [tool, touch(at(action.vertex))];
  }
}

/** Performs gestures with the pointer on a garden that does not change meanwhile. */
export function perform(
  state: GardenState,
  positions: readonly Point[],
  start: PointerState,
  gestures: readonly Gesture[],
): { pointer: PointerState; actions: Action[] } {
  let pointer = start;
  const actions: Action[] = [];
  for (const gesture of gestures) {
    if (gesture.kind === 'tool') {
      pointer = chooseTool(pointer, gesture.tool);
    } else if (gesture.kind === 'done') {
      actions.push({ type: 'declareDone' });
    } else {
      const [first, ...rest] = gesture.points as [Point, ...Point[]];
      pointer = pressStart(pointer, state, positions, first);
      for (const point of rest) pointer = pressMove(pointer, state, positions, point).pointer;
      const released = pressEnd(
        pointer,
        state,
        positions,
        gesture.points[gesture.points.length - 1] as Point,
      );
      pointer = released.pointer;
      if (released.action !== null) actions.push(released.action);
    }
  }
  return { pointer, actions };
}
