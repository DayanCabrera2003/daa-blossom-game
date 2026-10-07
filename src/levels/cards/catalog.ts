import { invariant } from '@core/shared/invariant';
import { err, ok, type Result } from '@core/shared/result';
import cardsFile from './cards.json';
import { buildDemo, type CardDemo, type DemoError } from './demo';
import { CARD_IDS, cardsSchema, type CardId } from './schema';

/** Why the cards file cannot be used: its shape, a card missing or repeated, or a broken demo. */
export type CardsError =
  | { readonly code: 'schema'; readonly issues: readonly string[] }
  | { readonly code: 'missing' | 'repeated'; readonly id: CardId }
  | { readonly code: 'demo'; readonly id: CardId; readonly error: DemoError };

/**
 * Loads the mechanic cards from parsed JSON (GDD §5.11): checks the file's shape, that every
 * mechanic has exactly one card, and that every demo plays with the real rules.
 */
export function buildCards(json: unknown): Result<ReadonlyMap<CardId, CardDemo>, CardsError> {
  const parsed = cardsSchema.safeParse(json);
  if (!parsed.success) {
    return err({
      code: 'schema',
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    });
  }
  const demos = new Map<CardId, CardDemo>();
  for (const card of parsed.data) {
    if (demos.has(card.id)) return err({ code: 'repeated', id: card.id });
    const demo = buildDemo(card);
    if (!demo.ok) return err({ code: 'demo', id: card.id, error: demo.error });
    demos.set(card.id, demo.value);
  }
  const missing = CARD_IDS.find((id) => !demos.has(id));
  return missing === undefined ? ok(demos) : err({ code: 'missing', id: missing });
}

/**
 * Every card's demo, from the bundled `cards.json`. Its test plays every demo, so a broken card
 * never ships; reaching one here is a bug and stops the game loudly.
 */
export function cardDemos(): ReadonlyMap<CardId, CardDemo> {
  const cards = buildCards(cardsFile);
  invariant(cards.ok, 'a mechanic card does not load; run the cards tests');
  return cards.value;
}
