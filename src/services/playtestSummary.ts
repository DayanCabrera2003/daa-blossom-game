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
}

type Tally = { -readonly [K in keyof LevelSummary]: LevelSummary[K] } & {
  claims: { right: number; wrong: number };
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
      case 'history':
        break;
    }
    if (open?.level === entry.level) open.last = entry.at;
  }
  if (open !== null) close(open, open.last);
  return [...tallies.values()];
}
