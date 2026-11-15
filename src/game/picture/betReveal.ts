/**
 * What the mentor says when the lanterns that fit are revealed after a formal bet (GDD §5.4): right
 * or wrong, with the bet and the count. Spanish counts one lantern in the singular («1 farol»), so
 * a count of one has its own text, the key of the plural one with `.one` after it.
 */

/** An interface text and its parameters. */
export interface BetRevealText {
  readonly key: string;
  readonly params: Readonly<{ bet: number; count: number }>;
}

/** The text that reveals `count` lanterns after the bet `bet`. */
export function betReveal(bet: number, count: number): BetRevealText {
  const key = bet === count ? 'bet.revealRight' : 'bet.revealWrong';
  return { key: count === 1 ? `${key}.one` : key, params: { bet, count } };
}
