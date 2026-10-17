import type { AssetKey } from '../assets/keys';
import type { FrameName } from '../assets/frames';
import type { Speaker } from '../systems/speaker';

/**
 * The portrait each speaker shows beside the dialogue box (plan 06, section 1.3): the mentor and
 * the gnome are facesets of the Ninja Adventure pack; the Council of the Oaks is the round tree of
 * the nature tileset with a face drawn on its crown in the engine; the player and the notebook
 * have no portrait, since they have no voice. Every portrait sits in the pack's faceset frame.
 */

/** The faceset frame: its texture, its side, and the square inside it a portrait fills. */
export const PORTRAIT_BOX = {
  texture: 'ui.facesetBox',
  /** The side of the frame, in pixels. */
  size: 48,
  /** From the frame's edge to the inside, where the portrait starts. */
  inset: 5,
  /** The side of the inside: exactly a faceset of the pack. */
  inner: 38,
} as const satisfies {
  readonly texture: AssetKey;
  readonly size: number;
  readonly inset: number;
  readonly inner: number;
};

/** A stroke of the oak's face, a filled rectangle from the tree's top-left corner. */
export interface FaceStroke {
  readonly part: 'eye' | 'brow' | 'mouth';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The face of the Council on the crown of the round tree (32 × 32): two dark eyes, a mossy brow
 * over each, and a long, straight mouth, all on the light leaves of the crown.
 */
export const OAK_FACE: readonly FaceStroke[] = [
  { part: 'brow', x: 8, y: 6, width: 4, height: 1 },
  { part: 'brow', x: 19, y: 6, width: 4, height: 1 },
  { part: 'eye', x: 9, y: 8, width: 2, height: 2 },
  { part: 'eye', x: 20, y: 8, width: 2, height: 2 },
  { part: 'mouth', x: 13, y: 12, width: 6, height: 1 },
];

/** What a portrait is made of. */
export type Portrait =
  /** A faceset of the pack; `hops` when it gives a little jump as its speaker talks. */
  | { readonly kind: 'faceset'; readonly texture: AssetKey; readonly hops: boolean }
  /** The oak of the Council: a tree of a tileset, where it sits inside the frame, and its face. */
  | {
      readonly kind: 'oak';
      readonly tree: FrameName;
      readonly at: { readonly x: number; readonly y: number };
      readonly face: readonly FaceStroke[];
    };

/** The portraits of the speakers who have one. */
const PORTRAITS: Readonly<Partial<Record<Speaker, Portrait>>> = {
  sauce: { kind: 'faceset', texture: 'portrait.sauce', hops: false },
  // The only comic one: his portrait hops when he speaks.
  bruto: { kind: 'faceset', texture: 'portrait.bruto', hops: true },
  // The 32 × 32 tree centred in the 38 × 38 inside of the frame.
  oaks: { kind: 'oak', tree: 'oakFace', at: { x: 3, y: 3 }, face: OAK_FACE },
};

/** The portrait of `speaker`, or null for one who has none (the player, the notebook). */
export const portraitOf = (speaker: Speaker): Portrait | null => PORTRAITS[speaker] ?? null;
