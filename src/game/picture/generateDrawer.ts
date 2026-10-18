import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import type { Rect } from './boxDistance';
import { BUTTON_HEIGHT, flowButtons } from './panelLayout';

/**
 * Where the free mode's generate menu puts its pieces (plan 08, phase 11): a wooden drawer across
 * the bottom of the canvas, over the editor's two rows of buttons, low enough for the garden it
 * grows to stay in view above it while the player tries sizes. The generators flow left to right
 * in their order; under them, "−", the size and "+", then "Otro al azar", and "Listo" at the right
 * end. Pure: the scene measures its buttons and puts them where this says, and the tests measure
 * the real words, so nothing spills off the wood or onto another button.
 */

/** Around the drawer, inside its wood (across and down), and between two buttons and two rows. */
export const DRAWER = { margin: 2, padX: 6, padY: 5, gap: 3, rowGap: 3 } as const;

/** The widths of the drawer's pieces, as the scene measured them. */
export interface DrawerWidths {
  /** One per generator, in the menu's order. */
  readonly generators: readonly number[];
  readonly smaller: number;
  /** The size's text, at its widest. */
  readonly size: number;
  readonly larger: number;
  readonly another: number;
  readonly done: number;
}

/** The drawer laid out: its wood and the top-left corner of each piece. */
export interface DrawerLayout {
  readonly panel: Rect;
  readonly generators: readonly Point[];
  readonly smaller: Point;
  readonly size: Point;
  readonly larger: Point;
  readonly another: Point;
  readonly done: Point;
}

/** Lays the drawer out from the widths of its pieces. */
export function generateDrawer(widths: DrawerWidths): DrawerLayout {
  const left = DRAWER.margin + DRAWER.padX;
  const right = CANVAS_WIDTH - DRAWER.margin - DRAWER.padX;
  // Laid out from a top of 0, then moved down so the drawer's wood ends at the canvas's bottom.
  const flow = flowButtons(widths.generators, left, right, DRAWER.gap, 0);
  const controlsY = flow.bottom + DRAWER.rowGap;
  const height = controlsY + BUTTON_HEIGHT + 2 * DRAWER.padY;
  const top = CANVAS_HEIGHT - DRAWER.margin - height;
  const down = (point: Point): Point => ({ x: point.x, y: point.y + top + DRAWER.padY });
  const after = (x: number, width: number): number => x + width + DRAWER.gap;
  const sizeX = after(left, widths.smaller);
  const largerX = after(sizeX, widths.size);
  return {
    panel: {
      x: DRAWER.margin,
      y: top,
      width: CANVAS_WIDTH - 2 * DRAWER.margin,
      height,
    },
    generators: flow.positions.map(down),
    smaller: down({ x: left, y: controlsY }),
    size: down({ x: sizeX, y: controlsY }),
    larger: down({ x: largerX, y: controlsY }),
    another: down({ x: after(largerX, widths.larger) + DRAWER.gap, y: controlsY }),
    done: down({ x: right - widths.done, y: controlsY }),
  };
}
