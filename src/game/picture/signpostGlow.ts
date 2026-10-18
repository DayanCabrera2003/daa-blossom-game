import type { Rect } from './boxDistance';
import { HALO_FRAMES, lanternFlicker, type HaloRing } from './lanternFlicker';

/**
 * The glow of the lantern lit on a chapter's signpost (plan 08, the cosmetic of 130 stars): the
 * flickering two-tone halo of a garden's lantern (`lanternFlicker`), shrunk to stay inside the
 * signpost's own box, a pixel in from each edge, and made fainter, so it warms the post without
 * spilling over the secret flower's column beside it or the chapter's title after it.
 */

/** How much fainter than a garden's lantern a signpost's glow is. */
const FAINTER = 0.5;

/** The widest outer ring of a garden's lantern, which the signpost's room is matched to. */
const WIDEST = Math.max(...HALO_FRAMES.map((halo) => halo.outer.radius));

/** A signpost's glow at one instant: its centre and its two rings. */
export interface SignpostGlow {
  readonly x: number;
  readonly y: number;
  readonly inner: HaloRing;
  readonly outer: HaloRing;
}

/** The glow of lantern number `index`, lit on `sign`, at `now`. */
export function signpostGlow(sign: Rect, now: number, index: number): SignpostGlow {
  const { halo } = lanternFlicker(now, index);
  // The room from the centre to a pixel before the nearest edge.
  const room = Math.min(sign.width, sign.height) / 2 - 1;
  const ring = ({ radius, alpha }: HaloRing): HaloRing => ({
    radius: Math.floor((radius * room) / WIDEST),
    alpha: alpha * FAINTER,
  });
  return {
    x: sign.x + sign.width / 2,
    y: sign.y + sign.height / 2,
    inner: ring(halo.inner),
    outer: ring(halo.outer),
  };
}

/** The box a glow lights: the square around its outer ring. */
export function glowBox({ x, y, outer }: SignpostGlow): Rect {
  return {
    x: x - outer.radius,
    y: y - outer.radius,
    width: 2 * outer.radius,
    height: 2 * outer.radius,
  };
}
