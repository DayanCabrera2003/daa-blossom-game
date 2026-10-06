/**
 * Time allowed to properties that run Bruto on a thousand gardens of up to 12 sprouts. They take a
 * few seconds, more with coverage instrumentation on a CI runner, which is beyond vitest's default
 * of 5 s per test. The answer is to give them room, not fewer cases: they are the empirical proof.
 */
export const BRUTO_PROPERTY_TIMEOUT = 60_000;
