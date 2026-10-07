/**
 * The whole zoom the game is drawn at right now (×3 on 1440×810, ×4 on 1080p). Levels, layout and
 * input all speak in the 480×270 logical canvas; only the renderer needs this number: the camera
 * of each scene zooms by it, and text is rasterised at it so letters stay sharp instead of being
 * drawn at 8 real pixels and blown up.
 */
let zoom = 1;

/** The current drawing zoom. */
export const renderZoom = (): number => zoom;

/** Sets the drawing zoom: at start, and whenever the window changes size. */
export function setRenderZoom(next: number): void {
  zoom = next;
}
