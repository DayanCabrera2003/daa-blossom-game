import { labelStars } from './starIcon';

/**
 * The label of a level's button in the hub: its number, then the blank cells where its stars are
 * drawn (the pixel font has no star, `labelStars`). The cells are kept for every star the level can
 * give, won or not and open or locked, so winning a star never widens the button nor moves the
 * buttons after it (GDD §6); only the stars won are drawn, from the left of the cells. Blanks, never
 * a mark: any other character after the number (a middle dot, say) the pixel font draws as a stray
 * raised dot. Pure: the scene writes the text and draws the stars in the room this leaves.
 */
export interface LevelButtonLabel {
  /** What the button says. */
  readonly text: string;
  /** The blank cells left for the stars, and where each star won starts in them. */
  readonly room: ReturnType<typeof labelStars>;
}

/**
 * The label of level `id`'s button: `open` or locked, with the `stars` it has won out of the
 * `ceiling` it can give (`levels/starsCeiling.ts`).
 */
export function levelButtonLabel(
  id: string,
  open: boolean,
  stars: number,
  ceiling: number,
): LevelButtonLabel {
  const cells = labelStars(ceiling);
  const won = open ? Math.min(stars, ceiling) : 0;
  const text = cells.spaces === 0 ? id : `${id} ${' '.repeat(cells.spaces)}`;
  return { text, room: { spaces: cells.spaces, offsets: cells.offsets.slice(0, won) } };
}
