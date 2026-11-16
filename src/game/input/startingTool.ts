import type { Level } from '@levels/build';
import { levelTools } from './levelTools';
import { toolOf, type ToolId } from './tools';

/**
 * The tool in hand as a level starts (GDD §5.1, «La barra de herramientas»): nothing changes tool
 * by itself, so the level hands the one its first move needs, read from its reference solution.
 * Where the light searches by itself every tool folds, opens and drags alike, and the level starts
 * with the first tool of its bar; so does a level with no move of its own to make. The layers make
 * no move and are never handed: with nothing else on the bar, the hand holds the lanterns.
 */
export function startingTool(level: Level): ToolId {
  const bar = levelTools(level, false);
  const first = level.start.allowed.has('stepLight')
    ? undefined
    : level.solution.map((move) => toolOf(move.type)).find((tool) => tool !== null);
  if (first !== undefined && first !== null && bar.includes(first)) return first;
  return bar[0] ?? 'lanterns';
}
