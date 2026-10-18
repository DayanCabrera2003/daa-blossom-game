// The order of the dialogue lines in the review sheets (plan 09, phase 11; plan 10, phase 0):
// level by level in the order of the game, and inside a level by the number of the line. Pure.
import { compareLevelIds } from '@levels/catalog';

/** A dialogue line id: chapter and level, then the speaker and the number of the line. */
const LINE_ID = /^ch(\d+\.\d+)\.[a-z]+\.(\d+)$/;

/** The level and the number of a line id; lines of an unknown shape go last, by id. */
export function placeOf(id: string): { level: string; number: number } {
  const match = LINE_ID.exec(id);
  return { level: match?.[1] ?? '?', number: Number(match?.[2] ?? 0) };
}

/** Sorts line ids level by level, then by the number of the line, then by id. */
export function compareLineIds(a: string, b: string): number {
  const [one, other] = [placeOf(a), placeOf(b)];
  return compareLevelIds(one.level, other.level) || one.number - other.number || (a < b ? -1 : 1);
}
