/**
 * Who says a line of dialogue (plan 06, phase 5), so the box can show the speaker's portrait and,
 * later, babble in the speaker's voice. A dialogue line names its speaker in its id
 * (`ch4.11.sauce.03` is the mentor's); the interface texts the box also says, such as the generic
 * hints, the words that let a stuck player go and the reveal of a bet, are the mentor's.
 */

/** Everyone who speaks in the dialogue box: the voiced characters, the player and the notebook. */
export const SPEAKERS = ['sauce', 'bruto', 'oaks', 'gardener', 'notebook'] as const;

/** One who speaks in the dialogue box. */
export type Speaker = (typeof SPEAKERS)[number];

/** A line as the box shows it: its id (the seed of its voice), its text and who says it. */
export interface SpokenLine {
  readonly id: string;
  readonly text: string;
  readonly speaker: Speaker;
}

/** Whether a name is one of the speakers. */
const isSpeaker = (name: string | undefined): name is Speaker =>
  SPEAKERS.some((speaker) => speaker === name);

/** A dialogue line id: chapter and level, the speaker's name, the line's number. */
const LINE_ID = /^ch\d+\.\d+\.([a-z]+)\.\d+$/;

/**
 * The speaker of the line or interface text `id`. Anything that is not a dialogue line of a known
 * speaker is the mentor's: he is the one who talks to the player between the lines of the script.
 */
export function speakerOf(id: string): Speaker {
  const name = LINE_ID.exec(id)?.[1];
  return isSpeaker(name) ? name : 'sauce';
}

/** The line `id` with its text, as `text` writes it, and its speaker. */
export const spokenLine = (id: string, text: (id: string) => string): SpokenLine => ({
  id,
  text: text(id),
  speaker: speakerOf(id),
});
