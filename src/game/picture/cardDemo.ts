import { itemAt } from '@core/shared/itemAt';
import type { CardDemo, DemoButton, DemoGesture } from '@levels/cards/demo';
import { DEMO_AREA } from '@levels/cards/schema';
import { NO_SELECTION } from '../input/selection';
import type { Point } from '../input/target';
import type { GardenPicture, PointingExtras } from './garden';
import { layerPicture } from './layerPicture';
import { layerView } from './layers';

/** One frame of a card's demo as drawn, in the logical pixels of the demo's own box. */
export interface CardDemoPicture {
  /** The tiny garden, without names: it is the gesture that matters, not who is who. */
  readonly garden: GardenPicture;
  /** Silver lanterns over the garden, between their sprouts. */
  readonly silver: readonly { readonly a: Point; readonly b: Point }[];
  /** Where the player's finger touches on this frame. */
  readonly touches: readonly Point[];
  /** Where the sun stands on its track (0 dawn, 1 now), in demos that move it; null otherwise. */
  readonly sun: number | null;
  /** The options under the garden, and the one picked on this frame; null without options. */
  readonly choices: {
    readonly count: number;
    readonly kind: 'numbers' | 'lines';
    readonly picked: number | null;
  } | null;
  /** The interface text of the button pressed on this frame, or null. */
  readonly press: string | null;
}

/** The interface text of each button a demo can press. */
const BUTTON_TEXT: Readonly<Record<DemoButton, string>> = {
  undo: 'hud.undo',
  redo: 'hud.redo',
  done: 'hud.done',
  check: 'hud.checkMirror',
  leaveLayer: 'hud.leaveLayer',
};

/** The middle of the demo's box, where a touch on the garden lands. */
const BOX_MIDDLE: Point = { x: DEMO_AREA.width / 2, y: DEMO_AREA.height / 2 };

/** What the garden itself shows of a gesture: a chain dragged, or a loop chosen. */
function pointing(gesture: DemoGesture): PointingExtras {
  return {
    selection: gesture.kind === 'loop' ? { kind: 'loop', vertices: gesture.sprouts } : NO_SELECTION,
    highlight: [],
    chain: gesture.kind === 'drag' ? gesture.path : null,
  };
}

/** Where a gesture's touches land: on sprouts, on the middle of vines, or on the garden. */
function touchesOf(gesture: DemoGesture, at: (vertex: number) => Point): Point[] {
  switch (gesture.kind) {
    case 'touch':
      return gesture.sprouts.map(at);
    case 'vines':
      return gesture.vines.map(([u, v]) => ({
        x: (at(u).x + at(v).x) / 2,
        y: (at(u).y + at(v).y) / 2,
      }));
    case 'tapGarden':
      return [BOX_MIDDLE];
    default:
      return [];
  }
}

/**
 * The picture of frame `frame` of a card's demo (the last frame once past the end): the tiny
 * garden as the rules left it, seen from the flower entered with the layers (5.2), the gesture over
 * it, and what the demo shows around it (silver lanterns, the sun's track, the choices, a button
 * pressed). The view only paints it.
 */
export function cardDemoPicture(demo: CardDemo, frame: number): CardDemoPicture {
  const shown = itemAt(demo.frames, Math.min(frame, demo.frames.length - 1));
  const { gesture } = shown;
  const view = layerView(shown.state.layer, demo.positions, shown.layers);
  const at = (vertex: number): Point => itemAt(view.positions, vertex);
  return {
    garden: layerPicture(
      shown.state,
      view,
      demo.names.map(() => ''),
      pointing(gesture),
    ),
    silver: shown.silver.map(([u, v]) => ({ a: at(u), b: at(v) })),
    touches: touchesOf(gesture, at),
    sun: demo.showsSun ? shown.sun : null,
    choices:
      demo.choices === null
        ? null
        : { ...demo.choices, picked: gesture.kind === 'pick' ? gesture.option : null },
    press: gesture.kind === 'press' ? BUTTON_TEXT[gesture.button] : null,
  };
}
