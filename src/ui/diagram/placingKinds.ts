import { coverPicture, coverWords } from '@ui/model/coverPicture';
import { onTheMoons } from '@ui/model/coverPlay';
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
