import { itemAt } from '@core/shared/itemAt';
import type { Design, DesignSprout } from '@levels/sandbox/design';
import { initialDesignPointer } from '../input/designIntent';
import type { Point } from '../input/target';
import type { CardDemoPicture, CardLoop } from './cardDemo';
import { designPicture } from './designPicture';

/**
 * The mechanic card of the free mode's editor (GDD §5.11, plan 08 phase 11): the first time the
 * editor opens, a short window shows the gesture, not the idea. Its tiny garden, in the box of the
 * cards' demos, does what the editor's tools do by themselves, in a loop: a touch on the grass
 * plants a sprout, then another; a touch on two sprouts grows a vine between them; a touch on the
 * vine hangs a lantern. It is drawn by the editor's own picture, so it looks like the real thing.
 */

/** The id the card is remembered by among the cards seen; no card of the levels uses it. */
export const EDITOR_CARD = 'sandboxEditor';

/** The three sprouts of the tiny garden, in the demo box's pixels. */
const A: DesignSprout = { label: 'A', x: 24, y: 32 };
const B: DesignSprout = { label: 'B', x: 60, y: 20 };
const C: DesignSprout = { label: 'C', x: 96, y: 34 };

/** The middle of a vine, where a touch lights it. */
const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** One frame: the design shown, the sprout chosen (for a vine), and where the finger touches. */
interface EditorFrame {
  readonly design: Design;
  readonly selected?: string;
  readonly touches: readonly Point[];
}

const ONE: Design = { sprouts: [A], vines: [], lanterns: [] };
const TWO: Design = { ...ONE, sprouts: [A, B] };
const THREE: Design = { ...ONE, sprouts: [A, B, C] };
const JOINED: Design = { ...THREE, vines: [['A', 'B']] };
const LIT: Design = { ...JOINED, lanterns: [['A', 'B']] };

/** The loop, frame by frame. */
const FRAMES: readonly EditorFrame[] = [
  { design: ONE, touches: [] },
  { design: TWO, touches: [B] },
  { design: THREE, touches: [C] },
  { design: THREE, selected: 'A', touches: [A] },
  { design: JOINED, touches: [B] },
  { design: JOINED, touches: [] },
  { design: LIT, touches: [middle(A, B)] },
  { design: LIT, touches: [] },
];

/** The picture of one frame: the tiny garden, unnamed, and the finger. */
function framePicture(frame: EditorFrame): CardDemoPicture {
  const pointer = { ...initialDesignPointer('vine'), selected: frame.selected ?? null };
  const garden = designPicture(frame.design, pointer);
  return {
    garden: { ...garden, sprouts: garden.sprouts.map((sprout) => ({ ...sprout, label: '' })) },
    silver: [],
    touches: frame.touches.map(({ x, y }) => ({ x, y })),
    sun: null,
    choices: null,
    press: null,
  };
}

/** The card's loop for its window; past the last frame it stays on the last. */
export function editorCardLoop(): CardLoop {
  const pictures = FRAMES.map(framePicture);
  return {
    frames: pictures.length,
    pictureAt: (frame) => itemAt(pictures, Math.min(Math.max(0, frame), pictures.length - 1)),
  };
}
