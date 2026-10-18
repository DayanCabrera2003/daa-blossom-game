import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';

/**
 * Synthetic levels for the script steps the secret flowers bring (plan 08, phase 1): the tangle of
 * 2.5, where the player counts the threads the reflection wins before it is separated, and the
 * council of 7.6, which asks for a second, different certificate. They are the gardens the plan
 * designs, kept here so the tests keep their data when the real level files are written. Each one
 * is loaded through the real loader, so it is validated exactly like a level file.
 */

/** Loads a fixture; a fixture that does not load is a broken test, so it stops loudly. */
function load(json: unknown): Level {
  const loaded = loadLevel(json);
  if (!loaded.ok) throw new Error(`a fixture level does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
}

/** Sprouts in a row from (`x`, `y`), 60 px apart. */
const row = (labels: readonly string[], x: number, y: number) =>
  labels.map((label, i) => ({ label, x: x + 60 * i, y }));

/** The vines joining each label to the next one. */
const chainOf = (labels: readonly string[]): string[][] =>
  labels.slice(1).map((label, i) => [labels[i] ?? label, label]);

/**
 * The tangle of 2.5, four pieces: thread I `1–…–6` (yours `2=3, 4=5`; the reflection's `1=2, 3=4,
 * 5=6`: the reflection wins), thread II `p–q–r–s` (yours `q=r`; the reflection's `p=q, r=s`: the
 * reflection wins), thread III `u–…–z` (yours `u=v, w=x, y=z`; the reflection's `v=w, x=y`: yours
 * wins) and the loop `a–b–c–d–a` (a draw). Yours 8, the reflection 9, the most 10: the reflection
 * wins two threads, while its lanterns are only one more than yours.
 */
export const TANGLE = {
  id: '2.5',
  secret: { stars: 6 },
  sprouts: [
    ...row(['1', '2', '3', '4', '5', '6'], 40, 50),
    ...row(['p', 'q', 'r', 's'], 40, 110),
    ...row(['u', 'v', 'w', 'x', 'y', 'z'], 40, 170),
    { label: 'a', x: 400, y: 110 },
    { label: 'b', x: 450, y: 110 },
    { label: 'c', x: 450, y: 170 },
    { label: 'd', x: 400, y: 170 },
  ],
  vines: [
    ...chainOf(['1', '2', '3', '4', '5', '6']),
    ...chainOf(['p', 'q', 'r', 's']),
    ...chainOf(['u', 'v', 'w', 'x', 'y', 'z']),
    ...chainOf(['a', 'b', 'c', 'd', 'a']),
  ],
  lanterns: [
    ['2', '3'],
    ['4', '5'],
    ['q', 'r'],
    ['u', 'v'],
    ['w', 'x'],
    ['y', 'z'],
    ['a', 'b'],
    ['c', 'd'],
  ],
  mirror: [
    ['1', '2'],
    ['3', '4'],
    ['5', '6'],
    ['p', 'q'],
    ['r', 's'],
    ['v', 'w'],
    ['x', 'y'],
    ['b', 'c'],
    ['d', 'a'],
  ],
  goal: { visible: false },
  victory: { type: 'maximum' },
  flow: [
    { step: 'mirror' },
    { step: 'count', prompt: 'ch2.5.sauce.00', of: 'winningThreads', range: 4 },
    { step: 'separate' },
    { step: 'play' },
  ],
  solution: [
    { type: 'answer', option: 2 },
    { type: 'tapGarden' },
    { type: 'chain', path: ['1', '2', '3', '4', '5', '6'] },
    { type: 'chain', path: ['p', 'q', 'r', 's'] },
    { type: 'declareDone' },
  ],
};

/**
 * The council of 7.6: a row `a–b–c` and, apart, the triangles `p–q–r` and `s–t–o` joined by the
 * bridge `r–M–s`, with `p=q` and `s=t` lit. The most is 4 lanterns, two sprouts left in the dark;
 * the stones that prove it are ∅, {b}, {M} and {b, M}. The walkthrough lights `a=b` and `r=M`,
 * presents no stones, then {M}.
 */
export const COUNCIL = {
  id: '7.6',
  secret: { stars: 8 },
  sprouts: [
    ...row(['a', 'b', 'c'], 40, 60),
    { label: 'p', x: 60, y: 150 },
    { label: 'q', x: 120, y: 210 },
    { label: 'r', x: 140, y: 130 },
    { label: 'M', x: 220, y: 130 },
    { label: 's', x: 300, y: 130 },
    { label: 't', x: 320, y: 210 },
    { label: 'o', x: 380, y: 150 },
  ],
  vines: [
    ...chainOf(['a', 'b', 'c']),
    ...chainOf(['p', 'q', 'r', 'p']),
    ...chainOf(['r', 'M', 's']),
    ...chainOf(['s', 't', 'o', 's']),
  ],
  lanterns: [
    ['p', 'q'],
    ['s', 't'],
  ],
  goal: { visible: false },
  victory: { type: 'tutteBergeCertificate' },
  flow: [{ step: 'play' }, { step: 'certifyAgain', repeated: 'ch7.6.oaks.02' }],
  solution: [
    { type: 'join', u: 'a', v: 'b' },
    { type: 'join', u: 'r', v: 'M' },
    { type: 'declareDone' },
    { type: 'liftStone', vertex: 'M' },
    { type: 'declareDone' },
  ],
};

/** The level built from `TANGLE`. */
export const tangleLevel = (): Level => load(TANGLE);

/** The level built from `COUNCIL`. */
export const councilLevel = (): Level => load(COUNCIL);
