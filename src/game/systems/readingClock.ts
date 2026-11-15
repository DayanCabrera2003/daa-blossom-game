/**
 * The clock the hint wait runs on (GDD §5.3): the scene's own, stopped while a dialogue or a card
 * is open, since reading is not being stuck. It only ever adds up the time read, so the play time
 * it gives never runs backwards.
 */
export interface ReadingClock {
  /** The milliseconds read in readings already over. */
  readonly read: number;
  /** When the reading open now began, or null while nothing is read. */
  readonly since: number | null;
}

/** A clock with nothing read yet. */
export const startReadingClock = (): ReadingClock => ({ read: 0, since: null });

/** The clock at scene time `time`, `reading` or not: a reading begins or ends, or nothing changes. */
export function tickReading(clock: ReadingClock, time: number, reading: boolean): ReadingClock {
  if (reading && clock.since === null) return { ...clock, since: time };
  if (!reading && clock.since !== null)
    return { read: clock.read + time - clock.since, since: null };
  return clock;
}

/** The play time at scene time `time`: the scene's time without what has been read. */
export const playTime = (clock: ReadingClock, time: number): number =>
  time - clock.read - (clock.since === null ? 0 : time - clock.since);
