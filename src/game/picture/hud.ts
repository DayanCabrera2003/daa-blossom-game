import { size } from '@core/matching/queries';
import { isUiUnlocked } from '@levels/uiUnlocks';
import type { PointerState } from '../input/pointer';
import { availableTools, type ToolId } from '../input/tools';
import { canRedo, canUndo } from '../systems/history';
import { garden, isHintAvailable, stepNow, type LevelSession } from '../systems/levelSession';
import type { StarResult } from '../systems/stars';
import { fractionOfStep } from '../systems/sun';
import { shownReflection, ties } from './pond';

/** An interface text to show, as a key of `content/` and its parameters. */
export interface TextRef {
  readonly key: string;
  readonly params: Readonly<Record<string, number>>;
}

/** Everything the HUD shows at one moment. */
export interface HudPicture {
  /**
   * "This garden can light N lanterns", or when the goal is hidden the question (GDD §5.2), or the
   * bet made.
   */
  readonly goal: TextRef;
  readonly lanterns: number;
  /** Water spent and budget, in levels with fog or a budget; null elsewhere. */
  readonly water: { readonly used: number; readonly budget: number | null } | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canDeclareDone: boolean;
  readonly hintAvailable: boolean;
  /**
   * The sun on its slider, how many states the day has, and whether it calls for the player (the
   * script waits for the sun to move); null before it unlocks (0.5).
   */
  readonly sun: {
    readonly fraction: number;
    readonly steps: number;
    readonly calling: boolean;
  } | null;
  readonly tools: readonly ToolId[];
  readonly tool: ToolId;
  readonly won: StarResult | null;
  /** Whether the drawn reflection can be checked now: in the mirror challenge only. */
  readonly canCheckMirror: boolean;
  /**
   * What the script waits for the player to do, when it is not playing the garden or answering a
   * panel: drag the sun, touch a sprout, touch the garden, draw a reflection. Without it a level
   * could wait in silence for a gesture nobody was told about.
   */
  readonly prompt: TextRef | null;
  /**
   * How many flowers deep the layers are (0 outside), told on the bar with a way out when inside;
   * null before they unlock (5.2).
   */
  readonly layers: number | null;
}

/** The steps that wait for a gesture outside the garden's own moves, and what to say for each. */
const PROMPTS: Partial<Record<string, string>> = {
  sun: 'hud.prompt.sun',
  explore: 'hud.prompt.explore',
  separate: 'hud.prompt.separate',
  draw: 'hud.prompt.draw',
};

/**
 * The goal on the top bar: the number of lanterns when it is visible; when hidden, the question, or
 * once a bet is made the bet itself (plan 03, decision 4). The real value is told by the mentor
 * when the level is won, so the bar keeps recalling the bet. With the reflection in the pond, your
 * lanterns against its own (plan 03, phase 7), or against the one drawn in the mirror challenge.
 */
function goalText(session: LevelSession): TextRef {
  const yours = garden(session).matching;
  // In the mirror challenge, the bar sets your lanterns against the reflection being drawn.
  if (stepNow(session)?.step === 'draw') {
    const drawn = size(session.challenge.draft);
    return { key: 'hud.mirror', params: { yours: size(yours), mirror: drawn } };
  }
  // While the reflection is shown, the bar sets your lanterns against it, until you tie.
  const mirror = shownReflection(session);
  if (mirror !== null && !ties(yours, mirror)) {
    return { key: 'hud.mirror', params: { yours: size(yours), mirror: size(mirror) } };
  }
  const { goal } = session.level.data;
  if (goal.visible) return { key: 'hud.goal', params: { count: goal.value } };
  const { bet } = session.flow;
  return bet === null
    ? { key: 'hud.goalHidden', params: {} }
    : { key: 'hud.bet', params: { count: bet.value } };
}

/**
 * The picture of the HUD for a session, the tool in hand, at time `now`, `depth` flowers deep in
 * the layers.
 */
export function hudPicture(
  session: LevelSession,
  pointer: PointerState,
  now: number,
  depth = 0,
): HudPicture {
  const state = garden(session);
  const { data } = session.level;
  const { history } = session;
  const step = stepNow(session)?.step;
  const prompt = step === undefined ? undefined : PROMPTS[step];
  const layers = isUiUnlocked('layers', data.id);
  return {
    goal: goalText(session),
    lanterns: size(state.matching),
    water:
      data.fog || data.water !== null ? { used: session.waterSpent, budget: data.water } : null,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    canDeclareDone: state.allowed.has('declareDone'),
    hintAvailable: isHintAvailable(session, now),
    sun: isUiUnlocked('sun', data.id)
      ? {
          fraction: fractionOfStep(history.cursor, history.states.length),
          steps: history.states.length,
          calling: step === 'sun',
        }
      : null,
    tools: availableTools(state.allowed, layers),
    tool: pointer.tool,
    won: session.won,
    canCheckMirror: step === 'draw',
    prompt: prompt === undefined ? null : { key: prompt, params: {} },
    layers: layers ? depth : null,
  };
}
