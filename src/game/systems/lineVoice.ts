import { babble, type Syllable } from './babble';
import type { SpokenLine } from './speaker';
import { PACES, revealTimes } from './typewriter';

/** How the dialogue box speaks a line: when each character appears, and the babble over it. */
export interface VoicedLine {
  /** When each character appears, in ms after the line starts (see `typewriter.ts`). */
  readonly reveal: readonly number[];
  /** The syllables of the speaker's babble, in the order they start (see `babble.ts`). */
  readonly syllables: readonly Syllable[];
}

/**
 * How `line` is spoken: typed at its speaker's pace and babbled in his voice. The box asks this of
 * the text exactly as it will show it (already broken into rows), so both fit what is on screen.
 */
export const voiceLine = (line: SpokenLine): VoicedLine => ({
  reveal: revealTimes(line.text, PACES[line.speaker]),
  syllables: babble(line),
});
