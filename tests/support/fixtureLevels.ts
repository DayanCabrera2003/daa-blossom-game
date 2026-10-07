import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';

/**
 * Synthetic levels for tests that need a garden of chapters 4, 5 or 7: copies of the drafts those
 * chapters started from, so the tests keep their data when the level files are rewritten, and a
 * garden for the flower challenge (4.11). Each one
 * is loaded through the real loader, so it is validated exactly like a level file. The ids are kept,
 * because the tools a level opens follow its id.
 */

/** Loads a fixture; a fixture that does not load is a broken test, so it stops loudly. */
function load(json: unknown): Level {
  const loaded = loadLevel(json);
  if (!loaded.ok) throw new Error(`a fixture level does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
}

/**
 * A triangle `b–c–d` on a stem `R–a=b`, with `c=d` lit and an exit `c–e` (as level 4.1 was
 * drafted): six sprouts `R a b c d e` as 0…5, three hints, and a chain through the loop to win.
 */
const FESTIVAL = {
  id: '4.1',
  sprouts: [
    { label: 'R', x: 50, y: 135 },
    { label: 'a', x: 130, y: 135 },
    { label: 'b', x: 210, y: 135 },
    { label: 'c', x: 290, y: 85 },
    { label: 'd', x: 290, y: 185 },
    { label: 'e', x: 390, y: 85 },
  ],
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ['c', 'e'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  goal: { visible: true, value: 3 },
  victory: { type: 'matchingSize', value: 3 },
  hints: [
    { line: 'ch4.1.sauce.01' },
    { line: 'ch4.1.sauce.02', highlight: ['e'] },
    { line: 'ch4.1.sauce.03', highlight: ['R', 'a', 'b', 'd'] },
  ],
  flow: [{ step: 'say', lines: ['ch4.1.sauce.00', 'ch4.1.sauce.04'] }, { step: 'play' }],
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
    { type: 'chain', path: ['R', 'a', 'b', 'd', 'c', 'e'] },
  ],
};

/**
 * The garden of the festival searched from R alone, as level 4.2 is designed (GDD 4.2): the search
 * stops at the conflict d–b, the player points at it, then the loop it closes, `b c d`, is
 * counted. Sprouts `R a b c d e` as 0…5.
 */
const BETRAYAL = {
  ...FESTIVAL,
  id: '4.2',
  roots: ['R'],
  hints: [],
  victory: { type: 'searchComplete' },
  flow: [
    { step: 'play' },
    { step: 'pickVine', prompt: 'ch4.2.sauce.01', reply: 'ch4.2.sauce.03' },
    { step: 'count', prompt: 'ch4.2.sauce.02', of: 'loop', range: 6 },
  ],
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
    { type: 'pickVine', u: 'd', v: 'b' },
    { type: 'answer', option: 3 },
  ],
};

/**
 * Five petals `b–c=d–f=g–b` on a stem `R–a=b`, with an exit `c–e` (as level 4.6 was drafted):
 * the solution folds the flower, marks past it, opens it and chains `R…e` around it. Sprout ids
 * follow the order written: `R a b c d f g e` are 0…7.
 */
const FIVE_PETALS = {
  id: '4.6',
  sprouts: [
    { label: 'R', x: 40, y: 135 },
    { label: 'a', x: 110, y: 135 },
    { label: 'b', x: 180, y: 135 },
    { label: 'c', x: 240, y: 60 },
    { label: 'd', x: 330, y: 90 },
    { label: 'f', x: 330, y: 190 },
    { label: 'g', x: 240, y: 210 },
    { label: 'e', x: 330, y: 30 },
  ],
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'f'],
    ['f', 'g'],
    ['g', 'b'],
    ['c', 'e'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
    ['f', 'g'],
  ],
  goal: { visible: true, value: 4 },
  victory: { type: 'matchingSize', value: 4 },
  flow: [{ step: 'say', lines: ['ch4.6.sauce.00'] }, { step: 'play' }],
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
    { type: 'markMoon', from: 'b', to: 'g' },
    { type: 'foldAt', from: 'd', to: 'f' },
    { type: 'markMoon', from: 'c', to: 'e' },
    { type: 'unfold', blossom: 0 },
    { type: 'chain', path: ['R', 'a', 'b', 'g', 'f', 'd', 'c', 'e'] },
  ],
};

/**
 * The triangle `b–c=d` on the stem `R–a=b` with no exit (as level 4.9 was drafted): the goal is
 * hidden and the lanterns lit are already the most, so "Terminé" wins at once.
 */
const CLOSED_FLOWER = {
  id: '4.9',
  sprouts: [
    { label: 'R', x: 80, y: 135 },
    { label: 'a', x: 160, y: 135 },
    { label: 'b', x: 240, y: 135 },
    { label: 'c', x: 320, y: 85 },
    { label: 'd', x: 320, y: 185 },
  ],
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  goal: { visible: false },
  victory: { type: 'maximum' },
  flow: [{ step: 'say', lines: ['ch4.9.sauce.00'] }, { step: 'play' }],
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
    { type: 'foldAt', from: 'd', to: 'b' },
    { type: 'declareDone' },
  ],
};

/**
 * The garden of the festival, with folding forbidden and the stem to rotate (as level 4.10 was
 * drafted): turning `R–a=b` lights the flower base, then a chain `b…e` wins.
 */
const STEM_ROTATION = {
  id: '4.10',
  sprouts: [
    { label: 'R', x: 50, y: 135 },
    { label: 'a', x: 130, y: 135 },
    { label: 'b', x: 210, y: 135 },
    { label: 'c', x: 290, y: 85 },
    { label: 'd', x: 290, y: 185 },
    { label: 'e', x: 390, y: 85 },
  ],
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ['c', 'e'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  goal: { visible: true, value: 3 },
  forbid: ['fold', 'foldAt'],
  victory: { type: 'matchingSize', value: 3 },
  flow: [{ step: 'say', lines: ['ch4.10.sauce.00'] }, { step: 'play' }],
  unlocks: { actions: ['rotateStem'] },
  solution: [
    { type: 'rotateStem', stem: ['R', 'a', 'b'] },
    { type: 'chain', path: ['b', 'd', 'c', 'e'] },
  ],
};

/**
 * Two flowers, one inside the other (as level 5.1 was drafted): the triangle `b–c=d` folds
 * first, then the loop `R–a…g=h–R` around it. Sprout ids follow the order written: `R a b c d g h
 * t` are 0…7.
 */
const NESTED_FLOWERS = {
  id: '5.1',
  sprouts: [
    { label: 'R', x: 60, y: 135 },
    { label: 'a', x: 140, y: 75 },
    { label: 'b', x: 230, y: 75 },
    { label: 'c', x: 300, y: 135 },
    { label: 'd', x: 300, y: 30 },
    { label: 'g', x: 230, y: 200 },
    { label: 'h', x: 140, y: 200 },
    { label: 't', x: 140, y: 30 },
  ],
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ['c', 'g'],
    ['g', 'h'],
    ['h', 'R'],
    ['a', 't'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
    ['g', 'h'],
  ],
  goal: { visible: true, value: 4 },
  victory: { type: 'matchingSize', value: 4 },
  flow: [{ step: 'say', lines: ['ch5.1.sauce.00'] }, { step: 'play' }],
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markMoon', from: 'b', to: 'c' },
    { type: 'foldAt', from: 'd', to: 'b' },
    { type: 'markMoon', from: 'c', to: 'g' },
    { type: 'foldAt', from: 'h', to: 'R' },
    { type: 'markMoon', from: 'a', to: 't' },
    { type: 'unfold', blossom: 1 },
    { type: 'unfold', blossom: 0 },
    { type: 'chain', path: ['t', 'a', 'b', 'd', 'c', 'g', 'h', 'R'] },
  ],
};

/** A loop of five `A=B–C=D–E–A` (as level 7.2 was drafted), won with a Tutte–Berge proof. */
const PENTAGON = {
  id: '7.2',
  sprouts: [
    { label: 'A', x: 240, y: 40 },
    { label: 'B', x: 330, y: 105 },
    { label: 'C', x: 295, y: 215 },
    { label: 'D', x: 185, y: 215 },
    { label: 'E', x: 150, y: 105 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'E'],
    ['E', 'A'],
  ],
  lanterns: [
    ['A', 'B'],
    ['C', 'D'],
  ],
  goal: { visible: false },
  victory: { type: 'tutteBergeCertificate' },
  flow: [{ step: 'say', lines: ['ch7.2.oaks.00'] }, { step: 'play' }],
  unlocks: { actions: ['liftStone', 'dropStone'] },
  solution: [{ type: 'declareDone' }],
};

/**
 * Three triangles hung from a centre `C` (as level 7.3 was drafted): lifting the stone of `C`
 * leaves three odd groups. Sprout ids follow the order written: `C` is 0, `p1…p3` are 1…3,
 * `q1…q3` are 4…6, `r1…r3` are 7…9.
 */
const HELIX = {
  id: '7.3',
  sprouts: [
    { label: 'C', x: 240, y: 135 },
    { label: 'p1', x: 240, y: 75 },
    { label: 'p2', x: 200, y: 30 },
    { label: 'p3', x: 280, y: 30 },
    { label: 'q1', x: 180, y: 170 },
    { label: 'q2', x: 110, y: 160 },
    { label: 'q3', x: 140, y: 220 },
    { label: 'r1', x: 300, y: 170 },
    { label: 'r2', x: 370, y: 160 },
    { label: 'r3', x: 340, y: 220 },
  ],
  vines: [
    ['C', 'p1'],
    ['C', 'q1'],
    ['C', 'r1'],
    ['p1', 'p2'],
    ['p2', 'p3'],
    ['p3', 'p1'],
    ['q1', 'q2'],
    ['q2', 'q3'],
    ['q3', 'q1'],
    ['r1', 'r2'],
    ['r2', 'r3'],
    ['r3', 'r1'],
  ],
  lanterns: [
    ['C', 'p1'],
    ['p2', 'p3'],
    ['q1', 'q2'],
    ['r1', 'r2'],
  ],
  goal: { visible: false },
  victory: { type: 'tutteBergeCertificate' },
  hints: [{ line: 'ch7.3.sauce.01' }, { line: 'ch7.3.sauce.02', highlight: ['C'] }],
  flow: [{ step: 'say', lines: ['ch7.3.oaks.00'] }, { step: 'play' }],
  solution: [{ type: 'liftStone', vertex: 'C' }, { type: 'declareDone' }],
};

/**
 * Two copies apart of the triangle on a stem, `R a b c d` and `R′ a′ b′ c′ d′` as 0…4 and 5…9
 * (as level 7.4 was drafted), won with a Tutte–Berge proof.
 */
const TWO_COMPONENTS = {
  id: '7.4',
  sprouts: [
    { label: 'R', x: 40, y: 70 },
    { label: 'a', x: 110, y: 70 },
    { label: 'b', x: 180, y: 70 },
    { label: 'c', x: 230, y: 30 },
    { label: 'd', x: 230, y: 110 },
    { label: "R'", x: 250, y: 200 },
    { label: "a'", x: 320, y: 200 },
    { label: "b'", x: 390, y: 200 },
    { label: "c'", x: 440, y: 160 },
    { label: "d'", x: 440, y: 220 },
  ],
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ["R'", "a'"],
    ["a'", "b'"],
    ["b'", "c'"],
    ["c'", "d'"],
    ["d'", "b'"],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
    ["a'", "b'"],
    ["c'", "d'"],
  ],
  goal: { visible: false },
  victory: { type: 'tutteBergeCertificate' },
  flow: [{ step: 'say', lines: ['ch7.4.sauce.00'] }, { step: 'play' }],
  unlocks: { codex: ['C12'] },
  solution: [
    { type: 'markRoot', vertex: 'R' },
    { type: 'markMoon', from: 'R', to: 'a' },
    { type: 'markRoot', vertex: "R'" },
    { type: 'markMoon', from: "R'", to: "a'" },
    { type: 'liftStone', vertex: 'a' },
    { type: 'liftStone', vertex: "a'" },
    { type: 'declareDone' },
  ],
};

/**
 * A garden like the one GDD 4.11 describes: the flower `b–c=d–f=g–b` with its base b in the dark,
 * exits `c–e`, `d–h` and `g–t`, the lit pair `h=x` leading to t, and `e–t` outside it, so e and t
 * are the two more sprouts in the dark. Sprouts `b c d f g e t h x` as 0…8, all in the left half of
 * the canvas so the folded garden fits beside it. Exported as a file, for tests that vary it.
 */
export const BLOOM = {
  id: '4.11',
  sprouts: [
    { label: 'b', x: 110, y: 75 },
    { label: 'c', x: 60, y: 110 },
    { label: 'd', x: 80, y: 165 },
    { label: 'f', x: 140, y: 165 },
    { label: 'g', x: 160, y: 110 },
    { label: 'e', x: 16, y: 40 },
    { label: 't', x: 216, y: 40 },
    { label: 'h', x: 60, y: 215 },
    { label: 'x', x: 180, y: 215 },
  ],
  vines: [
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'f'],
    ['f', 'g'],
    ['g', 'b'],
    ['c', 'e'],
    ['d', 'h'],
    ['h', 'x'],
    ['x', 't'],
    ['g', 't'],
    ['e', 't'],
  ],
  lanterns: [
    ['c', 'd'],
    ['f', 'g'],
    ['h', 'x'],
  ],
  flower: ['b', 'c', 'd', 'f', 'g'],
  goal: { visible: false },
  flow: [{ step: 'say', lines: ['ch4.11.sauce.00'] }],
  solution: [{ type: 'tapGarden' }],
};

/** The level built from `BLOOM`. */
export const bloomLevel = (): Level => load(BLOOM);

/** The level built from `FESTIVAL`. */
export const festivalLevel = (): Level => load(FESTIVAL);

/** The level built from `BETRAYAL`. */
export const betrayalLevel = (): Level => load(BETRAYAL);

/** The level built from `FIVE_PETALS`. */
export const fivePetalsLevel = (): Level => load(FIVE_PETALS);

/** The level built from `CLOSED_FLOWER`. */
export const closedFlowerLevel = (): Level => load(CLOSED_FLOWER);

/** The level built from `STEM_ROTATION`. */
export const stemRotationLevel = (): Level => load(STEM_ROTATION);

/** The level built from `NESTED_FLOWERS`. */
export const nestedFlowersLevel = (): Level => load(NESTED_FLOWERS);

/** The level built from `PENTAGON`. */
export const pentagonLevel = (): Level => load(PENTAGON);

/** The level built from `HELIX`. */
export const helixLevel = (): Level => load(HELIX);

/** The level built from `TWO_COMPONENTS`. */
export const twoComponentsLevel = (): Level => load(TWO_COMPONENTS);
