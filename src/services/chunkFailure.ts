/**
 * The parts of the game that load on demand, each in a chunk of its own (plan 07 and 08): the
 * books, the free mode's share sheet, the credits and the free mode itself.
 */
export const LAZY_PARTS = ['books', 'share', 'credits', 'sandbox'] as const;

/** A part of the game that loads on demand. */
export type LazyPart = (typeof LAZY_PARTS)[number];

/**
 * What to tell a player whose part did not load (plan 09, phase 10): to check the connection, or
 * that a new version of the game was published while the tab was open and its chunks are gone.
 */
export type ChunkNotice = 'offline' | 'updated';

/**
 * What the browsers say when an import() cannot fetch its chunk (Chrome and Edge, Firefox,
 * Safari), and Vite when it cannot preload the chunk's stylesheet.
 */
const LOAD_FAILURES = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
];

/** Whether `error` is a chunk that did not arrive, rather than a bug in one that did. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return LOAD_FAILURES.some((failure) => failure.test(error.message));
}

/**
 * What the browser knows after a chunk failed: whether it thinks itself online, and whether a fresh
 * request for the page itself was answered.
 */
export interface NetworkProbe {
  readonly online: boolean;
  readonly pageAnswered: boolean;
}

/**
 * The notice for a part that failed with `error`, or null when it is a bug of a part that loaded
 * (that stays in the console; the game goes on). A chunk that did not arrive while the page itself
 * still answers is gone from the server: a new version was published and the old tab asks for
 * files that no longer exist, so it should reload. Without an answer, the connection is down.
 */
export function chunkNotice(error: unknown, probe: NetworkProbe): ChunkNotice | null {
  if (!isChunkLoadError(error)) return null;
  return probe.online && probe.pageAnswered ? 'updated' : 'offline';
}
