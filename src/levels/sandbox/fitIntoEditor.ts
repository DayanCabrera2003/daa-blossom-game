import type { Design } from './design';
import { EDITOR_AREA } from './editorArea';

/**
 * A garden opened from a level file, fitted into the editor's free area (plan 09, phase 1). A file
 * only keeps its sprouts inside a level's sprout area, which runs higher and lower than the
 * editor's: a sprout near its top would wear its crown and name under the editor's header, one
 * near its bottom its name over the buttons. The garden moves up or down just enough to fit, all of
 * it at once, so every distance, crossing and name reads as before; the free area's edges already
 * count the tallest crown and the lowest name (`editorArea.ts`). A garden too tall to fit, or one
 * that already fits, stays where it is (the same object), and can still be edited.
 */
export function fitIntoEditor(design: Design): Design {
  if (design.sprouts.length === 0) return design;
  const ys = design.sprouts.map((sprout) => sprout.y);
  const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
  if (bottom - top > EDITOR_AREA.y1 - EDITOR_AREA.y0) return design;
  // Down when it starts too high, up when it ends too low; never both, since it fits.
  const shift = Math.max(0, EDITOR_AREA.y0 - top) - Math.max(0, bottom - EDITOR_AREA.y1);
  if (shift === 0) return design;
  return {
    ...design,
    sprouts: design.sprouts.map((sprout) => ({ ...sprout, y: sprout.y + shift })),
  };
}
