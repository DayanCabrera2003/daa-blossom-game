/**
 * The flicker of a lantern (GDD §4.1: "halo de 2 tonos, parpadeo de 3 frames"): three frames of a
 * halo in two tones, a warm inner one and a wide faint outer one, shown in turn. Each lantern
 * starts at its own frame, so the lanterns of a garden flicker out of step, like real flames.
 */

/** One ring of a halo: its radius in logical pixels and its opacity. */
export interface HaloRing {
  readonly radius: number;
  readonly alpha: number;
}

/** A halo in two tones: `inner` in the lantern's amber, `outer` in its pale glow. */
export interface Halo {
  readonly inner: HaloRing;
  readonly outer: HaloRing;
}

/** The three frames, a breath in and out: small, large, middle. */
export const HALO_FRAMES: readonly [Halo, Halo, Halo] = [
  { inner: { radius: 8, alpha: 0.5 }, outer: { radius: 12, alpha: 0.22 } },
  { inner: { radius: 9, alpha: 0.58 }, outer: { radius: 14, alpha: 0.28 } },
  { inner: { radius: 8, alpha: 0.54 }, outer: { radius: 13, alpha: 0.25 } },
];

/** How long each frame shows, in milliseconds. */
export const FLICKER_FRAME_MS = 160;

/** The frame lantern number `index` shows at `now`, and its halo. */
export function lanternFlicker(now: number, index: number): { frame: 0 | 1 | 2; halo: Halo } {
  const step = Math.floor(now / FLICKER_FRAME_MS) + index;
  const frame = (((step % 3) + 3) % 3) as 0 | 1 | 2;
  return { frame, halo: HALO_FRAMES[frame] };
}
