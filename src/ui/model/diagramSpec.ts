import { z } from 'zod';
import { err, ok, type Result } from '@core/shared/result';
import { CARD_IDS, type CardId } from '@levels/cards/schema';

/**
 * A `diagram` block of a Codex entry (plan 07, §1.1 and phases 4 and 5): the small garden the
 * intuition tab draws, as JSON. It names its garden (a level of the catalog, the tiny garden of a
 * mechanic card, or a garden code), what kind of diagram it is and, by kind, the moves the reader
 * may make (`play`), the day that is replayed under the sun (`replay`), or one of the special
 * diagrams (the pond, the scarecrows, the cut at a flower, the stones, the recipe, and the chart
 * of the races, which names the levels whose races it shows instead of a garden). Its title and help line, when
 * given, are keys of `strings.json`; the content tests check that every block names what exists.
 */

/** The moves a garden to play may allow: the lantern moves, the only ones a page needs. */
export const DIAGRAM_MOVES = ['join', 'split', 'passLantern', 'chain'] as const;

/** A move a garden to play may allow. */
export type DiagramMove = (typeof DIAGRAM_MOVES)[number];

/**
 * Where a replayed day comes from: the level's reference solution, played by the rules from where
 * its play begins; a run of Edmonds' algorithm from the starting lanterns; the light's own search
 * (4.1, which never folds); or the mechanical gardener following the right recipe (6.2).
 */
export const TRACE_SOURCES = ['solution', 'edmonds', 'autoSearch', 'recipe'] as const;

/** Where a replayed day comes from. */
export type TraceSource = (typeof TRACE_SOURCES)[number];

/** A level of the catalog, by its id. */
const levelId = z.string().regex(/^\d+\.\d+$/, 'expected chapter.level, like 4.10');

/** The garden of a diagram: exactly one of a level, a card or a garden code. */
const garden = {
  level: levelId.optional(),
  card: z.enum(CARD_IDS).optional(),
  code: z.string().min(1).optional(),
};

/** The words around a diagram, as text keys. */
const words = { title: z.string().min(1).optional(), help: z.string().min(1).optional() };

/** A garden the reader plays on, with the moves the block allows (each named once). */
const play = z.strictObject({
  kind: z.literal('play'),
  ...garden,
  moves: z
    .array(z.enum(DIAGRAM_MOVES))
    .min(1)
    .refine((moves) => new Set(moves).size === moves.length, 'a move is named twice'),
  ...words,
});

/** A day replayed under the sun, from one of the sources of a trace. */
const replay = z.strictObject({
  kind: z.literal('replay'),
  ...garden,
  trace: z.enum(TRACE_SOURCES),
  ...words,
});

/**
 * A special diagram of plan 07, phase 5, on its garden: the pond with a level's reflection (C3),
 * scarecrows to place (C5), the cut of a chain at a level's flower (C8), the mechanical gardener
 * following the recipe card by card (C10) and stones to lift (C12).
 */
const special = (kind: 'pond' | 'cover' | 'cut' | 'recipe' | 'stones') =>
  z.strictObject({ kind: z.literal(kind), ...garden, ...words });

/** The kinds that need a level of their own: its reflection, or its flower. */
const LEVEL_ONLY: readonly string[] = ['pond', 'cut'];

/** The chart of the races some levels run (C11): the gardens are the races', not the block's. */
const chart = z.strictObject({
  kind: z.literal('chart'),
  races: z.array(levelId).min(1),
  ...words,
});

/** A diagram block as the entry writes it. */
export const diagramSpec = z
  .discriminatedUnion('kind', [
    play,
    replay,
    special('pond'),
    special('cover'),
    special('cut'),
    special('recipe'),
    special('stones'),
    chart,
  ])
  .refine(
    (spec) => spec.kind === 'chart' || gardensNamed(spec) === 1,
    'name exactly one garden: a level, a card or a code',
  )
  .refine(
    (spec) => spec.kind !== 'replay' || spec.trace !== 'solution' || spec.level !== undefined,
    'only a level has a reference solution to replay',
  )
  .refine(
    (spec) =>
      !LEVEL_ONLY.includes(spec.kind) || (spec.kind !== 'chart' && spec.level !== undefined),
    'only a level has a reflection or a flower to draw',
  );

/** Where the garden of a block is found: a level, a card or a code (exactly one of them). */
export interface GardenSource {
  readonly level?: string | undefined;
  readonly card?: CardId | undefined;
  readonly code?: string | undefined;
}

/** How many gardens a block names. */
const gardensNamed = (spec: GardenSource): number =>
  [spec.level, spec.card, spec.code].filter((source) => source !== undefined).length;

/** A diagram block, read. */
export type DiagramSpec = z.infer<typeof diagramSpec>;

/** The kinds of diagram, and the blocks that draw a garden of their own (all but the chart). */
export type DiagramKind = DiagramSpec['kind'];
export type GardenDiagramSpec = Exclude<DiagramSpec, { kind: 'chart' }>;

/** The spec of a diagram block, or its issues as `path: message` lines. */
export function parseDiagramSpec(json: string): Result<DiagramSpec, readonly string[]> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (error) {
    return err([`not JSON: ${(error as Error).message}`]);
  }
  const parsed = diagramSpec.safeParse(data);
  if (parsed.success) return ok(parsed.data);
  return err(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
}
