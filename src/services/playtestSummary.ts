import type { PlaytestLog } from './playtestLog';

/** What the playtest of Hito A measures for one level (GDD §10), over every play of it. */
export interface LevelSummary {
  readonly level: string;
  readonly plays: number;
  readonly wins: number;
  readonly bestStars: number | null;
  /** Time spent playing it, in milliseconds. */
  readonly timeMs: number;
  readonly moves: number;
  readonly refusals: number;
  readonly hints: number;
  /** "Terminé" pressed with the most lanterns lit (right), or without reason (wrong). */
  readonly claims: { readonly right: number; readonly wrong: number };
  /** Options of a question (`ask`) or numbers of a `count` that were not the right one. */
  readonly wrongAnswers: number;
  /** Bets placed, and how many guessed the lanterns the garden holds (informal ones included). */
  readonly bets: { readonly made: number; readonly right: number };
  /** False statements chosen in the notebook question. */
  readonly notebookWrong: number;
  /** Counterexample gardens opened. */
  readonly counterexamples: number;
  /** Drawn reflections checked, by whether they beat the garden. */
  readonly mirrorChecks: { readonly beating: number; readonly notBeating: number };
  /** Vines pointed at where the light went wrong (4.2), by whether they were the conflict. */
  readonly vinePicks: { readonly right: number; readonly wrong: number };
  /** Chains drawn in the flower challenge (4.11), counted or refused as no chain. */
  readonly flowerChains: { readonly counted: number; readonly refused: number };
  /**
   * Whether the first vine ever pointed at in the level was the conflict (Hito B, 4.2), or null if
   * no vine was pointed at. Later plays do not change it: they come back knowing the answer.
   */
  readonly firstPickRight: boolean | null;
  /**
   * Whether the first statement ever chosen in the level's notebook was a true one (Hito B, 4.11),
   * or null if the notebook was never answered. No hint can be opened while the notebook asks, so
   * a right first choice is one made without hints.
   */
  readonly notebookRightFirstTry: boolean | null;
}

type Tally = { -readonly [K in keyof LevelSummary]: LevelSummary[K] } & {
  claims: { right: number; wrong: number };
  bets: { made: number; right: number };
  mirrorChecks: { beating: number; notBeating: number };
  vinePicks: { right: number; wrong: number };
  flowerChains: { counted: number; refused: number };
};

const freshTally = (level: string): Tally => ({
  level,
  plays: 0,
  wins: 0,
  bestStars: null,
  timeMs: 0,
  moves: 0,
  refusals: 0,
  hints: 0,
  claims: { right: 0, wrong: 0 },
  wrongAnswers: 0,
  bets: { made: 0, right: 0 },
  notebookWrong: 0,
  counterexamples: 0,
  mirrorChecks: { beating: 0, notBeating: 0 },
  vinePicks: { right: 0, wrong: 0 },
  flowerChains: { counted: 0, refused: 0 },
  firstPickRight: null,
  notebookRightFirstTry: null,
});

/**
 * Rebuilds, from the raw entries, what each level cost its players, in the order levels were first
 * played. A play lasts from its start to its end; one cut short (page closed, game reopened) lasts
 * until its last entry, since nothing tells how long the player looked at it afterwards.
 */
export function summarize(log: PlaytestLog): LevelSummary[] {
  const tallies = new Map<string, Tally>();
  const tally = (level: string): Tally => {
    const found = tallies.get(level);
    if (found !== undefined) return found;
    const fresh = freshTally(level);
    tallies.set(level, fresh);
    return fresh;
  };
  /** The play going on: its level, when it started, and its latest entry. */
  let open: { level: string; start: number; last: number } | null = null;
  const close = (play: { level: string; start: number }, end: number): void => {
    tally(play.level).timeMs += end - play.start;
    open = null;
  };

  for (const entry of log.entries) {
    if (entry.kind === 'sessionStart') {
      if (open !== null) close(open, open.last);
      continue;
    }
    const counts = tally(entry.level);
    switch (entry.kind) {
      case 'levelStart':
        if (open !== null) close(open, open.last);
        open = { level: entry.level, start: entry.at, last: entry.at };
        counts.plays += 1;
        continue;
      case 'levelEnd':
        if (open?.level === entry.level) close(open, entry.at);
        if (entry.outcome === 'won') {
          counts.wins += 1;
          counts.bestStars = Math.max(counts.bestStars ?? 0, entry.stars ?? 0);
        }
        continue;
      case 'move':
        counts.moves += 1;
        break;
      case 'refused':
        counts.refusals += 1;
        break;
      case 'hint':
        counts.hints += 1;
        break;
      case 'claim':
        if (entry.right) counts.claims.right += 1;
        else counts.claims.wrong += 1;
        break;
      case 'answer':
        if (!entry.right) counts.wrongAnswers += 1;
        break;
      case 'bet':
        counts.bets.made += 1;
        if (entry.right) counts.bets.right += 1;
        break;
      case 'notebook':
        if (!entry.right) counts.notebookWrong += 1;
        counts.notebookRightFirstTry ??= entry.right;
        break;
      case 'counterexample':
        counts.counterexamples += 1;
        break;
      case 'mirrorCheck':
        if (entry.beats) counts.mirrorChecks.beating += 1;
        else counts.mirrorChecks.notBeating += 1;
        break;
      case 'pickVine':
        if (entry.right) counts.vinePicks.right += 1;
        else counts.vinePicks.wrong += 1;
        counts.firstPickRight ??= entry.right;
        break;
      case 'flowerChain':
        if (entry.counted) counts.flowerChains.counted += 1;
        else counts.flowerChains.refused += 1;
        break;
      case 'history':
        break;
    }
    if (open?.level === entry.level) open.last = entry.at;
  }
  if (open !== null) close(open, open.last);
  return [...tallies.values()];
}
