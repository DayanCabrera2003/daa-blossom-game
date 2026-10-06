import { invariant } from '../shared/invariant';
import type { ActionType } from './actions';

/**
 * The level where each action is unlocked (GDD §5.1; "Terminé" from §5.2), as `chapter.level`.
 * A level allows what it has unlocked, possibly narrowed by its own JSON (4.10 closes folding for
 * the day). Listed in order of unlocking, which is the order `actionsUnlockedBy` returns.
 */
export const UNLOCKED_AT: Readonly<Record<ActionType, string>> = {
  join: '0.1',
  split: '0.1',
  passLantern: '1.1',
  chain: '1.3',
  declareDone: '1.8',
  inspect: '3.1',
  markRoot: '3.1',
  markMoon: '3.1',
  placeScarecrow: '3.7',
  removeScarecrow: '3.7',
  fold: '4.4',
  foldAt: '4.4',
  unfold: '4.5',
  rotateStem: '4.10',
  liftStone: '7.2',
  dropStone: '7.2',
};

/** `chapter.level` as a pair of numbers, so 4.10 sorts after 4.9. */
const parseLevelId = (id: string): [number, number] => {
  const match = /^(\d+)\.(\d+)$/.exec(id);
  invariant(match !== null, `level id must be chapter.level, got "${id}"`);
  return [Number(match[1]), Number(match[2])];
};

/** Every action unlocked at or before level `levelId`. */
export function actionsUnlockedBy(levelId: string): ActionType[] {
  const [chapter, level] = parseLevelId(levelId);
  return (Object.entries(UNLOCKED_AT) as [ActionType, string][])
    .filter(([, at]) => {
      const [c, l] = parseLevelId(at);
      return c < chapter || (c === chapter && l <= level);
    })
    .map(([action]) => action);
}
