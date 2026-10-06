import type { ActionType } from '@core/rules/actions';
import { UNLOCKED_AT } from '@core/rules/permissions';
import { z } from 'zod';

/**
 * The shape of a level file (`levels/data/chN/N-M.json`), the single source of truth of a level's
 * logic. Files name sprouts by their labels (`"R"`, `"a"`…), as the design document
 * does; `build.ts` turns names into ids. Objects are strict so a typo is an error, never ignored.
 */

/** Every action of the game, taken from the unlock table so the two can never drift apart. */
const actionType = z.enum(Object.keys(UNLOCKED_AT) as [ActionType, ...ActionType[]]);

/** A sprout's name as written in the level. */
const label = z.string().min(1);

/** A dialogue line id, which is also the name of its voice file: `ch4.11.sauce.03`. */
const lineId = z
  .string()
  .regex(/^ch\d+\.\d+\.[a-z]+\.\d{2}$/, 'expected a line id like ch4.11.sauce.03');

/**
 * A sprout and where it sits on the 480×270 canvas: inside the garden area, clear of the HUD bars
 * (the goal and the sun on top, tools and buttons in two rows at the bottom) and of the edges.
 */
const sprout = z.strictObject({
  label,
  x: z.number().int().min(8).max(472),
  y: z.number().int().min(28).max(226),
});

const vine = z.tuple([label, label]);
const path = z.array(label).min(1);

/** A player action as a level writes it: the same as `core/rules/actions.ts`, with names. */
const levelAction = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('join'), u: label, v: label }),
  z.strictObject({ type: z.literal('split'), u: label, v: label }),
  z.strictObject({ type: z.literal('passLantern'), from: label, to: label }),
  z.strictObject({ type: z.literal('chain'), path }),
  z.strictObject({ type: z.literal('rotateStem'), stem: path }),
  z.strictObject({ type: z.literal('inspect'), vertex: label }),
  z.strictObject({ type: z.literal('markRoot'), vertex: label }),
  z.strictObject({ type: z.literal('markMoon'), from: label, to: label }),
  z.strictObject({ type: z.literal('foldAt'), from: label, to: label }),
  z.strictObject({ type: z.literal('fold'), loop: path }),
  z.strictObject({ type: z.literal('unfold'), blossom: z.number().int().min(0) }),
  z.strictObject({ type: z.literal('placeScarecrow'), vertex: label }),
  z.strictObject({ type: z.literal('removeScarecrow'), vertex: label }),
  z.strictObject({ type: z.literal('liftStone'), vertex: label }),
  z.strictObject({ type: z.literal('dropStone'), vertex: label }),
  z.strictObject({ type: z.literal('declareDone') }),
]);

/** The declarative victory condition (`core/rules/victory.ts`). */
const victory = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('matchingSize'), value: z.number().int().min(0) }),
  z.strictObject({ type: z.literal('maximum') }),
  z.strictObject({ type: z.literal('chainFound') }),
  z.strictObject({ type: z.literal('coverCertificate') }),
  z.strictObject({ type: z.literal('tutteBergeCertificate') }),
]);

/** The goal shown to the player: "this garden can light N lanterns", or hidden (GDD §5.2). */
const goal = z.discriminatedUnion('visible', [
  z.strictObject({ visible: z.literal(true), value: z.number().int().min(0) }),
  z.strictObject({ visible: z.literal(false) }),
]);

/** A notebook question (GDD §5.5): a prompt and options, at least one of them right. */
const notebook = z.strictObject({
  prompt: lineId,
  options: z
    .array(z.strictObject({ line: lineId, correct: z.boolean() }))
    .min(2)
    .refine((options) => options.some((option) => option.correct), 'no option is correct'),
});

export const levelSchema = z.strictObject({
  /** `chapter.level`, e.g. `4.10`. */
  id: z.string().regex(/^\d+\.\d+$/, 'expected chapter.level, like 4.10'),
  /** Sprouts in id order: the n-th sprout is vertex n. */
  sprouts: z.array(sprout).min(1),
  vines: z.array(vine),
  /** Lanterns lit when the level starts. */
  lanterns: z.array(vine).default([]),
  goal,
  fog: z.boolean().default(false),
  /** Water budget for the extra star; null when the level does not count water. */
  water: z.number().int().min(0).nullable().default(null),
  /** Actions unlocked by now that this level keeps closed (4.10 closes folding). */
  forbid: z.array(actionType).default([]),
  victory,
  /** Hints: a voiced line and the sprouts to highlight (GDD §5.3). */
  hints: z
    .array(z.strictObject({ line: lineId, highlight: z.array(label).default([]) }))
    .default([]),
  /** Lines spoken during the level, in order. */
  script: z.array(lineId).default([]),
  notebook: notebook.optional(),
  /** What finishing the level unlocks: actions and Codex entries (C1…C14). */
  unlocks: z
    .strictObject({
      actions: z.array(actionType).default([]),
      codex: z
        .array(z.string().regex(/^C(1[0-4]|[1-9])$/, 'expected a Codex entry C1…C14'))
        .default([]),
    })
    .default({ actions: [], codex: [] }),
  /** A reference solution, replayed by the integrity checks with the real rules. */
  solution: z.array(levelAction).min(1),
});

/** A level file after validation, defaults filled in. */
export type LevelData = z.infer<typeof levelSchema>;

/** One action of a reference solution, with sprout names. */
export type LevelAction = LevelData['solution'][number];
