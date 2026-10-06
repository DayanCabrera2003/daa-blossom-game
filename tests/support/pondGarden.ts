import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';

/**
 * The common garden of the Mirror Pond, 2.1–2.3 (GDD chapter 2), as synthetic level data: three
 * parts apart on screen.
 * - Part I, a thread `1–2–3–4–5–6`: yours `2=3, 4=5`, the reflection's `1=2, 3=4, 5=6`.
 * - Part II, a loop `a–b–c–d–a`: yours `a=b, c=d`, the reflection's `b=c, d=a`.
 * - Part III, a pair `e–f` lit on both sides.
 * Yours: 5 lanterns; the reflection: 6. Sprout ids follow the order written: `1`…`6` are 0…5,
 * `a`…`d` are 6…9, `e` and `f` are 10 and 11.
 */
export const POND_SPROUTS = [
  { label: '1', x: 40, y: 70 },
  { label: '2', x: 100, y: 70 },
  { label: '3', x: 160, y: 70 },
  { label: '4', x: 220, y: 70 },
  { label: '5', x: 280, y: 70 },
  { label: '6', x: 340, y: 70 },
  { label: 'a', x: 80, y: 150 },
  { label: 'b', x: 140, y: 150 },
  { label: 'c', x: 140, y: 205 },
  { label: 'd', x: 80, y: 205 },
  { label: 'e', x: 300, y: 170 },
  { label: 'f', x: 360, y: 170 },
];

/** The ids of the sprouts of the pond garden, by name. */
export const POND = Object.fromEntries(
  POND_SPROUTS.map((sprout, id) => [sprout.label, id]),
) as Record<string, number>;

/** The pond garden with the script `flow` (by default: the reflection appears, then play to 6). */
export function pondLevel(
  flow: unknown[] = [{ step: 'mirror' }, { step: 'play' }],
  extra: object = {},
): Level {
  const plays = flow.some((step) => (step as { step: string }).step === 'play');
  const loaded = loadLevel({
    id: '2.3',
    sprouts: POND_SPROUTS,
    vines: [
      ['1', '2'],
      ['2', '3'],
      ['3', '4'],
      ['4', '5'],
      ['5', '6'],
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
      ['e', 'f'],
    ],
    lanterns: [
      ['2', '3'],
      ['4', '5'],
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ],
    mirror: [
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
      ['b', 'c'],
      ['d', 'a'],
      ['e', 'f'],
    ],
    goal: { visible: true, value: 6 },
    ...(plays ? { victory: { type: 'matchingSize', value: 6 } } : {}),
    flow,
    solution: plays
      ? [{ type: 'chain', path: ['1', '2', '3', '4', '5', '6'] }]
      : [{ type: 'tapGarden' }],
    ...extra,
  });
  if (!loaded.ok) throw new Error(`the pond garden does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
}
