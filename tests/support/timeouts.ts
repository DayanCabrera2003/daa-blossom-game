/**
 * Time allowed to properties that run Bruto on a thousand gardens of up to 12 sprouts. They take a
 * few seconds, more with coverage instrumentation on a CI runner, which is beyond vitest's default
 * of 5 s per test. The answer is to give them room, not fewer cases: they are the empirical proof.
 */
export const BRUTO_PROPERTY_TIMEOUT = 60_000;

/**
 * Time allowed to a test that imports the real books chunk (KaTeX, marked, the Codex entries and
 * the gardens of its diagrams): the first import transforms all of it, which under coverage on a
 * busy machine takes longer than the second `vi.waitFor` gives by default.
 */
export const BOOKS_IMPORT_TIMEOUT = 15_000;

/**
 * Time allowed to properties that lay out gardens of the free mode: untangling a garden of 24
 * sprouts and 40 vines takes a few tens of milliseconds, so a few hundred of them, under coverage or
 * when exploring with thousands of cases, pass vitest's default of 5 s per test.
 */
export const LAYOUT_PROPERTY_TIMEOUT = 60_000;
