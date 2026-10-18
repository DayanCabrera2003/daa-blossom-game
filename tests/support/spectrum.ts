/**
 * How strongly `samples` (recorded at `rate` Hz) hold the frequency `hz`: one bin of a discrete
 * Fourier transform, enough to find the pitch of a synthesized bell in a test.
 */
export function magnitude(samples: Int16Array, hz: number, rate: number): number {
  let re = 0;
  let im = 0;
  for (let i = 0; i < samples.length; i++) {
    const phase = (2 * Math.PI * hz * i) / rate;
    re += (samples[i] ?? 0) * Math.cos(phase);
    im -= (samples[i] ?? 0) * Math.sin(phase);
  }
  return Math.hypot(re, im);
}

/** The strongest frequency between `low` and `high` Hz, scanned in steps of `step` Hz. */
export function strongest(
  samples: Int16Array,
  rate: number,
  range: { readonly low: number; readonly high: number; readonly step: number },
): number {
  let best = range.low;
  let bestMagnitude = -1;
  for (let hz = range.low; hz <= range.high; hz += range.step) {
    const m = magnitude(samples, hz, rate);
    if (m > bestMagnitude) {
      best = hz;
      bestMagnitude = m;
    }
  }
  return best;
}
