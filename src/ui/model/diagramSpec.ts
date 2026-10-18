import { z } from 'zod';
import { err, ok, type Result } from '@core/shared/result';
import { CARD_IDS } from '@levels/cards/schema';

/**
 * A `diagram` block of a Codex entry (plan 07, §1.1 and phase 4): the small garden the intuition
 * tab draws, as JSON. It names its garden (a level of the catalog, the tiny garden of a mechanic
 * card, or a garden code), what kind of diagram it is and, by kind, the moves the reader may make
 * (`play`) or the day that is replayed under the sun (`replay`). Its title and help line, when
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

/** The garden of a diagram: exactly one of a level, a card or a garden code. */
const garden = {
  level: z
    .string()
    .regex(/^\d+\.\d+$/, 'expected chapter.level, like 4.10')
    .optional(),
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

/** A diagram block as the entry writes it. */
export const diagramSpec = z
  .discriminatedUnion('kind', [play, replay])
  .refine(
    (spec) =>
      [spec.level, spec.card, spec.code].filter((source) => source !== undefined).length === 1,
    'name exactly one garden: a level, a card or a code',
  )
  .refine(
    (spec) => spec.kind !== 'replay' || spec.trace !== 'solution' || spec.level !== undefined,
    'only a level has a reference solution to replay',
  );

/** A diagram block, read. */
export type DiagramSpec = z.infer<typeof diagramSpec>;

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
