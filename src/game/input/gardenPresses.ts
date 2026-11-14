/**
 * The presses that reached the garden, by pointer. A release only ends a press of its own pointer
 * that the garden heard: the touch that closes a panel (the last line of a dialogue, «Entendido»,
 * an answer, «Siguiente jardín») began on the panel, so its release never becomes a move on the
 * garden left free under it. A held press let go outside the screen, or over a button, ends with
 * no chain: whatever was being dragged is dropped and nothing is played.
 */

/** The ids of the pointers whose press reached the garden and is still held. */
export type GardenPresses = readonly number[];

/** No press held. */
export const NO_PRESSES: GardenPresses = [];

/** What ends a held press: a release on the garden, or a let go with no chain. */
export type PressEnd = 'release' | 'letGo';

/** Whether the press of pointer `id` reached the garden and is still held. */
export const pressHeld = (presses: GardenPresses, id: number): boolean => presses.includes(id);

/** `presses` without pointer `id`. */
const without = (presses: GardenPresses, id: number): GardenPresses =>
  presses.filter((held) => held !== id);

/**
 * A press of pointer `id`; `free` says whether it landed on the garden (nothing over it, no
 * dialogue, no panel's frame). Only then is it held and sent.
 */
export function pressDown(
  presses: GardenPresses,
  id: number,
  free: boolean,
): { presses: GardenPresses; send: boolean } {
  const others = without(presses, id);
  return free ? { presses: [...others, id], send: true } : { presses: others, send: false };
}

/**
 * The release of pointer `id`, `outside` the screen or on it, where `free` says whether it landed
 * on the garden. A press not held sends nothing; a held one ends as a release on the garden, or
 * else as a let go with no chain.
 */
export function pressUp(
  presses: GardenPresses,
  id: number,
  where: { readonly free: boolean; readonly outside: boolean },
): { presses: GardenPresses; send: PressEnd | null } {
  if (!pressHeld(presses, id)) return { presses, send: null };
  const send: PressEnd = where.free && !where.outside ? 'release' : 'letGo';
  return { presses: without(presses, id), send };
}
