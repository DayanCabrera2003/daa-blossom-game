import { labelStars } from './starIcon';

/**
 * The label of a level's button in the hub: its number, and after a won level's number the blank
 * cells where its stars are drawn (the pixel font has no star, `labelStars`). A locked level shows
 * its number alone: the button is greyed out already, and any character after the number (a
 * middle dot, say) the pixel font draws as a stray raised dot. Pure: the scene writes the text and
 * draws the stars in the room this leaves.
 */
export interface LevelButtonLabel {
  /** What the button says. */
  readonly text: string;
  /** The blank cells left for the stars, and where each star starts in them. */
  readonly room: ReturnType<typeof labelStars>;
}

/** The label of level `id`'s button: `open` or locked, with the `stars` it has won. */
export function levelButtonLabel(id: string, open: boolean, stars: number): LevelButtonLabel {
  const room = labelStars(open ? stars : 0);
  const text = room.spaces === 0 ? id : `${id} ${' '.repeat(room.spaces)}`;
  return { text, room };
}
