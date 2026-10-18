import { coverPicture, coverWords } from '@ui/model/coverPicture';
import { onTheMoons } from '@ui/model/coverPlay';
import { stonesPicture, stonesWords } from '@ui/model/stonesPicture';
import { liftTheMoons } from '@ui/model/stonesPlay';
import type { PlacingKind } from './PlacingDiagram';

/** The scarecrows of C5: guard the vines, or set them on the moons. */
export const SCARECROWS: PlacingKind = {
  piece: 'scarecrow',
  certify: 'diagram.cover.moons',
  certified: onTheMoons,
  picture: (layout, session, t) => {
    const picture = coverPicture(layout, session);
    return { ...picture, words: coverWords(picture.count, t) };
  },
};

/** The stones of C12: lift them, or lift the moons. */
export const STONES: PlacingKind = {
  piece: 'stone',
  certify: 'diagram.stones.moons',
  certified: liftTheMoons,
  picture: (layout, session, t) => {
    const picture = stonesPicture(layout, session);
    return { ...picture, words: stonesWords(picture.count, t) };
  },
};
