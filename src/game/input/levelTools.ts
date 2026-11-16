import { wonByClaim, type VictoryCondition } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { availableTools, type ToolId } from './tools';

/**
 * The tools a level of the catalog shows on its bar (GDD §5.1, «La barra de herramientas»), and
 * whether it offers "Terminé": what its actions allow, but only what the level can use, read from
 * its data. A tool that serves nothing there is left off, so the bar never offers a way to fail
 * that the level does not teach.
 */

/** The victories presented with scarecrows (3.7–3.10, 7.1) and with stones (chapter 7). */
const SCARECROW_VICTORIES: ReadonlySet<VictoryCondition['type']> = new Set([
  'coverCertificate',
  'coverComplete',
]);
const STONE_VICTORIES: ReadonlySet<VictoryCondition['type']> = new Set([
  'tutteBergeCertificate',
  'moonCertificate',
]);

/** The steps that play a search folding by itself, whose flowers the layers can enter. */
const FOLDING_STEPS: ReadonlySet<string> = new Set(['autoSearch', 'automaton']);

/**
 * Whether flowers can be folded in the level: one is folded as it starts, a search of the script
 * folds by itself, or its play step lets the player (or the light) fold at a clash.
 */
function mayFold(level: Level): boolean {
  const played = level.data.victory !== undefined && level.start.allowed.has('foldAt');
  return level.flower !== null || played || level.flow.some((step) => FOLDING_STEPS.has(step.step));
}

/**
 * Whether `tool` serves in the level: the tools of the garden only where a play step takes moves,
 * inspecting only in the fog, scarecrows and stones only where they are presented. The layers are
 * no move: they serve wherever a flower can be entered.
 */
function serves(level: Level, tool: ToolId): boolean {
  const { victory, fog } = level.data;
  if (tool === 'layers') return true;
  if (victory === undefined) return false;
  if (tool === 'inspect') return fog;
  if (tool === 'scarecrows') return SCARECROW_VICTORIES.has(victory.type);
  if (tool === 'stones') return STONE_VICTORIES.has(victory.type);
  return true;
}

/**
 * The tools on the bar of `level`, in toolbar order, with the layers when its interface has them
 * (`layers`, from 5.2) and its flowers can fold.
 */
export const levelTools = (level: Level, layers: boolean): ToolId[] =>
  availableTools(level.start.allowed, layers && mayFold(level)).filter((tool) =>
    serves(level, tool),
  );

/** Whether the level offers "Terminé" (or «Presentar»): learnt, and able to win its play step. */
export const offersDone = (level: Level): boolean => {
  const { victory } = level.data;
  return level.start.allowed.has('declareDone') && victory !== undefined && wonByClaim(victory);
};
