import type { Point } from '../input/target';

/**
 * The outline of a gear, the icon of the settings button: `teeth` square teeth round `centre`,
 * their tops at `outer` and the rim between them at `inner`. Each tooth fills half of its share of
 * the turn and the gap the other half. Drawn as a polygon, so the icon needs no glyph from the
 * font and no image.
 */
export function gearOutline(centre: Point, teeth: number, outer: number, inner: number): Point[] {
  const share = (2 * Math.PI) / teeth;
  const at = (angle: number, radius: number): Point => ({
    x: centre.x + radius * Math.cos(angle),
    y: centre.y + radius * Math.sin(angle),
  });
  return Array.from({ length: teeth }, (_, i) => {
    const start = i * share;
    const end = start + share / 2;
    return [at(start, inner), at(start, outer), at(end, outer), at(end, inner)];
  }).flat();
}
