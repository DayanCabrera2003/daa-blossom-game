import type { Matching } from '@core/matching/types';
import { itemAt } from '@core/shared/itemAt';
import type { Point } from '../input/target';
import { drawnPairs } from '../input/mirrorDraft';
import type { MirrorChallenge, MirrorCheck } from '../systems/mirrorChallenge';
import type { TextRef } from './hud';
import { tanglePicture, type PondPicture } from './tangle';

/**
 * The picture of the mirror challenge (GDD 2.4, plan 03 phase 8). While the player draws, only the
 * silver lanterns of the drawing show over the garden, whose own lanterns stay as they are. Once a
 * better reflection is checked, the game does what the pond taught: it overlays the drawing on your
 * lanterns, separates the tangle and points at the winning thread, which is a chain of yours. The
 * check stays shown until the next touch on the drawing. Pure.
 */
export function drawingPicture(
  yours: Matching,
  challenge: MirrorChallenge,
  positions: readonly Point[],
  labels: readonly string[],
): PondPicture {
  const { shown, draft } = challenge;
  if (shown?.kind === 'better') {
    const view = { separated: true, touched: null };
    const picture = tanglePicture(yours, draft, positions, labels, view);
    return { ...picture, winning: shown.pieces.indexOf(shown.piece) };
  }
  return {
    strands: drawnPairs(draft).map(([u, v]) => ({
      a: itemAt(positions, u),
      b: itemAt(positions, v),
      side: 'mirror',
      piece: null,
    })),
    sprouts: [],
    offsets: [],
    separated: false,
    dissolved: false,
    degree: null,
    winning: null,
  };
}

/**
 * What the player reads after a check: a reflection that does not beat you ("ese no te gana"), the
 * chain a better one leaves, or a reflection already tried, which counts no more.
 */
export function checkText(check: MirrorCheck): TextRef {
  if (check.kind === 'notBetter') {
    return { key: 'mirror.notBetter', params: { drawn: check.drawn, yours: check.yours } };
  }
  return { key: check.fresh ? 'mirror.chain' : 'mirror.again', params: {} };
}
