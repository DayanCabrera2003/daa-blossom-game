import { LOOK } from './look';

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

/** Frame `i` of the halo, from the table of the look (`look.ts`). */
const haloFrame = (i: 0 | 1 | 2): Halo => ({
  inner: { radius: LOOK.haloInnerRadius[i], alpha: LOOK.haloInnerAlpha[i] },
  outer: { radius: LOOK.haloOuterRadius[i], alpha: LOOK.haloOuterAlpha[i] },
});

/** The three frames, a breath in and out: small, large, middle. */
export const HALO_FRAMES: readonly [Halo, Halo, Halo] = [haloFrame(0), haloFrame(1), haloFrame(2)];

/** How long each frame shows, in milliseconds. */
export const FLICKER_FRAME_MS = 160;

/** The frame lantern number `index` shows at `now`, and its halo. */
export function lanternFlicker(now: number, index: number): { frame: 0 | 1 | 2; halo: Halo } {
  const step = Math.floor(now / FLICKER_FRAME_MS) + index;
  const frame = (((step % 3) + 3) % 3) as 0 | 1 | 2;
  return { frame, halo: HALO_FRAMES[frame] };
}
