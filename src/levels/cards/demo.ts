import { members } from '@core/blossom/hierarchy';
import type { LabelError } from '@core/graph/labels';
import { toEdges } from '@core/graph/labels';
import type { Edge, VertexId } from '@core/graph/types';
import { createMatching, type MatchingError } from '@core/matching/createMatching';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { RejectReason } from '@core/rules/reasons';
import { createGardenState, type GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import { err, ok, type Result } from '@core/shared/result';
import { EVERY_ACTION } from '../demoStart';
import type { FlowInput } from '../flowInput';
import { buildGarden, type GardenError } from '../garden';
import { toWalkthroughEntry } from '../translate';
import type { CardData, CardId } from './schema';

/** A button of the HUD a demo shows being pressed. */
export type DemoButton = 'undo' | 'redo' | 'done' | 'check';

/** What the player's hand does on a frame of a demo, drawn over the tiny garden. */
export type DemoGesture =
  | { readonly kind: 'none' }
  /** Touches on these sprouts, one after another (joining, marking, placing…). */
  | { readonly kind: 'touch'; readonly sprouts: readonly VertexId[] }
  /** Touches on vines (putting a lantern out, folding where suns meet, drawing a reflection). */
  | { readonly kind: 'vines'; readonly vines: readonly Edge[] }
  /** A drag through these sprouts (a chain, a stem). */
  | { readonly kind: 'drag'; readonly path: readonly VertexId[] }
  /** These sprouts chosen as a loop to fold. */
  | { readonly kind: 'loop'; readonly sprouts: readonly VertexId[] }
  /** A touch anywhere on the garden. */
  | { readonly kind: 'tapGarden' }
  /** One of the choices under the garden picked (a bet, an answer). */
  | { readonly kind: 'pick'; readonly option: number }
  | { readonly kind: 'press'; readonly button: DemoButton }
  /** The sun dragged along its track. */
  | { readonly kind: 'sun' };

/** One frame of a demo: the garden shown, the gesture over it, the sun and the silver lanterns. */
export interface DemoFrame {
  readonly state: GardenState;
  readonly gesture: DemoGesture;
  /** Where the sun stands in the demo's day, from dawn (0) to its last move (1). */
  readonly sun: number;
  /** Silver lanterns over the garden: a reflection's, or the ones drawn so far. */
  readonly silver: readonly Edge[];
}

/** A card's demo, ready to loop: its tiny garden and the frames it plays, in order. */
export interface CardDemo {
  readonly id: CardId;
  readonly names: readonly string[];
  readonly positions: readonly { readonly x: number; readonly y: number }[];
  /** The options under the garden, when the demo picks one; null otherwise. */
  readonly choices: NonNullable<CardData['choices']> | null;
  /** Whether the sun's track is drawn: the demo moves the sun. */
  readonly showsSun: boolean;
  readonly frames: readonly DemoFrame[];
}

/** Why a written step cannot be shown. */
export type DemoStepProblem = 'noUndo' | 'noRedo' | 'noChoices' | 'choiceOutOfRange' | 'badDrawn';

/** Why a card's demo is not a demo the game can play. */
export type DemoError =
  | GardenError
  | { readonly code: 'badMirror'; readonly error: MatchingError }
  | { readonly code: 'badLabel'; readonly step: number; readonly error: LabelError }
  | { readonly code: 'refused'; readonly step: number; readonly reason: RejectReason }
  | { readonly code: 'badStep'; readonly step: number; readonly why: DemoStepProblem };

/** The gesture that makes a move, as a player would do it on the garden `state`. */
function gestureOf(state: GardenState, action: Action): DemoGesture {
  switch (action.type) {
    case 'join':
      return { kind: 'touch', sprouts: [action.u, action.v] };
    case 'split':
      return { kind: 'vines', vines: [[action.u, action.v]] };
    case 'foldAt':
      return { kind: 'vines', vines: [[action.from, action.to]] };
    case 'passLantern':
    case 'markMoon':
      return { kind: 'touch', sprouts: [action.from, action.to] };
    case 'chain':
      return { kind: 'drag', path: action.path };
    case 'rotateStem':
      return { kind: 'drag', path: action.stem };
    case 'fold':
      return { kind: 'loop', sprouts: action.loop };
    case 'unfold': {
      // A folded flower is opened by touching it: every petal shows the touch.
      const flower = state.layer.nodes.find(
        (node) => node.kind === 'blossom' && node.id === action.blossom,
      );
      invariant(flower !== undefined, 'the rules open only a flower that is folded');
      return { kind: 'touch', sprouts: members(flower) };
    }
    case 'declareDone':
      return { kind: 'press', button: 'done' };
    default:
      return { kind: 'touch', sprouts: [action.vertex] };
  }
}

/** The day of a demo: its states, which one is shown, and the silver lanterns drawn so far. */
interface Day {
  states: GardenState[];
  cursor: number;
  silver: readonly Edge[];
}

/**
 * Builds the demo of a card (GDD §5.11): its tiny garden, with every action open, and one frame per
 * step showing the gesture on the garden as it is, then a last frame with the result. Moves are
 * played by the rules and keep a day like the level's own, so undo, redo and the sun walk it as
 * they would in a level; script inputs only draw (a touch, a pick, silver lanterns).
 */
export function buildDemo(card: CardData): Result<CardDemo, DemoError> {
  const built = buildGarden({
    names: card.sprouts.map((sprout) => sprout.label),
    vines: card.vines,
    lanterns: card.lanterns,
  });
  if (!built.ok) return built;
  const { labels, graph, matching } = built.value;

  const reflected = toEdges(labels, card.mirror);
  if (!reflected.ok) return err({ code: 'badLabel', error: reflected.error });
  const reflection = createMatching(graph, reflected.value);
  if (!reflection.ok) return err({ code: 'badMirror', error: reflection.error });

  const start = createGardenState({ graph, matching, fog: card.fog, allowed: [...EVERY_ACTION] });
  const day: Day = { states: [start], cursor: 0, silver: reflected.value };
  const frames: DemoFrame[] = [];
  const frame = (gesture: DemoGesture): void => {
    const last = day.states.length - 1;
    frames.push({
      state: itemAt(day.states, day.cursor),
      gesture,
      sun: last === 0 ? 0 : day.cursor / last,
      silver: day.silver,
    });
  };

  for (const [index, step] of card.steps.entries()) {
    const bad = (why: DemoStepProblem) => err({ code: 'badStep' as const, step: index, why });
    if (step.type === 'undo' || step.type === 'redo') {
      const back = step.type === 'undo';
      if (back ? day.cursor === 0 : day.cursor === day.states.length - 1)
        return bad(back ? 'noUndo' : 'noRedo');
      frame({ kind: 'press', button: step.type });
      day.cursor += back ? -1 : 1;
      continue;
    }
    const entry = toWalkthroughEntry(labels, step);
    if (!entry.ok) return err({ code: 'badLabel', step: index, error: entry.error });
    const problem = playInput(day, entry.value as Action | FlowInput, card, frame);
    if (problem === null) continue;
    if (problem.kind === 'refused')
      return err({ code: 'refused', step: index, reason: problem.reason });
    return bad(problem.why);
  }
  frame({ kind: 'none' });

  return ok({
    id: card.id,
    names: card.sprouts.map((sprout) => sprout.label),
    positions: card.sprouts.map(({ x, y }) => ({ x, y })),
    choices: card.choices ?? null,
    showsSun: card.steps.some((step) => step.type === 'seekSun'),
    frames,
  });
}

/** What went wrong playing one step: a move the rules refused, or a step that cannot show. */
type StepProblem =
  | { readonly kind: 'refused'; readonly reason: RejectReason }
  | { readonly kind: 'bad'; readonly why: DemoStepProblem };

/** Plays one move or script input on the day, adding its frame; null when all went well. */
function playInput(
  day: Day,
  entry: Action | FlowInput,
  card: CardData,
  frame: (gesture: DemoGesture) => void,
): StepProblem | null {
  const state = itemAt(day.states, day.cursor);
  switch (entry.type) {
    case 'bet':
    case 'answer': {
      const option = entry.type === 'bet' ? entry.value : entry.option;
      if (card.choices === undefined) return { kind: 'bad', why: 'noChoices' };
      if (option >= card.choices.count) return { kind: 'bad', why: 'choiceOutOfRange' };
      frame({ kind: 'pick', option });
      return null;
    }
    case 'seekSun':
      frame({ kind: 'sun' });
      day.cursor = Math.round(entry.fraction * (day.states.length - 1));
      return null;
    case 'tapGarden':
      frame({ kind: 'tapGarden' });
      return null;
    case 'tapSprout':
      frame({ kind: 'touch', sprouts: [entry.vertex] });
      return null;
    case 'drawMirror': {
      if (!createMatching(state.graph, entry.lanterns).ok) return { kind: 'bad', why: 'badDrawn' };
      // The touches go to the vines added since the last drawing.
      const before = new Set(day.silver.map(([u, v]) => `${u}-${v}`));
      const added = entry.lanterns.filter(([u, v]) => !before.has(`${u}-${v}`));
      frame({ kind: 'vines', vines: added });
      day.silver = entry.lanterns;
      return null;
    }
    case 'checkMirror':
      frame({ kind: 'press', button: 'check' });
      return null;
    default: {
      const outcome = applyAction(state, entry);
      if (!outcome.ok) return { kind: 'refused', reason: outcome.reason };
      frame(gestureOf(state, entry));
      // A new move forgets what could have been redone, as the level's own history does.
      day.states = [...day.states.slice(0, day.cursor + 1), outcome.state];
      day.cursor = day.states.length - 1;
      return null;
    }
  }
}
