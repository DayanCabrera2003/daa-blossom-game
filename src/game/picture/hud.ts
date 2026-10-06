import { size } from '@core/matching/queries';
import { isUiUnlocked } from '@levels/uiUnlocks';
import type { PointerState } from '../input/pointer';
import { availableTools, type ToolId } from '../input/tools';
import { canRedo, canUndo } from '../systems/history';
import { garden, isHintAvailable, type LevelSession } from '../systems/levelSession';
import type { StarResult } from '../systems/stars';
import { fractionOfStep } from '../systems/sun';

/** An interface text to show, as a key of `content/` and its parameters. */
export interface TextRef {
  readonly key: string;
  readonly params: Readonly<Record<string, number>>;
}

/** Everything the HUD shows at one moment. */
export interface HudPicture {
  /** "This garden can light N lanterns", or the question when the goal is hidden (GDD §5.2). */
  readonly goal: TextRef;
  readonly lanterns: number;
  /** Water spent and budget, in levels with fog or a budget; null elsewhere. */
  readonly water: { readonly used: number; readonly budget: number | null } | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canDeclareDone: boolean;
  readonly hintAvailable: boolean;
  /** The sun on its slider, and how many states the day has; null before it unlocks (0.5). */
  readonly sun: { readonly fraction: number; readonly steps: number } | null;
  readonly tools: readonly ToolId[];
  readonly tool: ToolId;
  readonly won: StarResult | null;
}

/** The picture of the HUD for a session, the tool in hand, at time `now`. */
export function hudPicture(session: LevelSession, pointer: PointerState, now: number): HudPicture {
  const state = garden(session);
  const { data } = session.level;
  const { history } = session;
  return {
    goal: data.goal.visible
      ? { key: 'hud.goal', params: { count: data.goal.value } }
      : { key: 'hud.goalHidden', params: {} },
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
        }
      : null,
    tools: availableTools(state.allowed),
    tool: pointer.tool,
    won: session.won,
  };
}
