import type { ActionType } from '@core/rules/actions';
import type { Level } from '@levels/build';
import type { Translate } from '@services/i18n';
import { levelTools } from '../input/levelTools';
import type { ToolId } from '../input/tools';
import type { Refusal } from '../systems/refusal';

/**
 * The advice that follows a refusal born of the tool in hand (GDD §5.1, «La barra de
 * herramientas»): «Prueba con {tool}.», naming the tool of the bar that does what the touch was
 * after. Only some refusals come from the wrong tool; the rest point nowhere.
 */

/** The tools that act on a sprout, each the other's alternative. */
const SPROUT_TOOLS: readonly ToolId[] = ['lanterns', 'marks'];

/** The actions on sprouts a level may close for the day, which the other sprout tool may do. */
const SPROUT_ACTIONS: ReadonlySet<ActionType> = new Set([
  'join',
  'passLantern',
  'chain',
  'markRoot',
  'markMoon',
]);

/** The tool the refusal points to, before checking that the bar shows it. */
function wanted(reason: Refusal, inHand: ToolId, level: Level): ToolId | null {
  const other = SPROUT_TOOLS.find((tool) => tool !== inHand) ?? null;
  switch (reason.code) {
    case 'vineHidden':
      return 'inspect';
    case 'notInTheDark':
      return 'lanterns';
    case 'chainNotSeen':
      // Only where the player searches by hand do the marks reach the chain.
      return level.start.allowed.has('markRoot') ? 'marks' : null;
    case 'noFog':
      return inHand === 'lanterns' ? 'marks' : 'lanterns';
    case 'actionClosed':
    case 'actionLocked':
      return SPROUT_ACTIONS.has(reason.action) ? other : null;
    default:
      return null;
  }
}

/**
 * The tool to try after `reason`, refused with `inHand` in `level`: one its bar shows and that is
 * not already in hand; null when the refusal was not the tool's fault.
 */
export function toolToTry(reason: Refusal, inHand: ToolId, level: Level): ToolId | null {
  const tool = wanted(reason, inHand, level);
  return tool !== null && tool !== inHand && levelTools(level, false).includes(tool) ? tool : null;
}

/** The sentence that advises the tool to try after `reason`, or null when there is none. */
export function toolAdvice(
  reason: Refusal,
  inHand: ToolId,
  level: Level,
  t: Translate,
): string | null {
  const tool = toolToTry(reason, inHand, level);
  return tool === null ? null : t('reason.tryTool', { tool: t(`tool.${tool}`) });
}
