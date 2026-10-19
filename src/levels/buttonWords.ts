import { isCertificate } from '@core/rules/victory';
import { referencedLines } from './lines';
import type { LevelData } from './schema';

/** The words on the button that ends a level, as the interface texts write them. */
export interface ButtonWords {
  /** "Terminé": the player claims the garden can do no better. */
  readonly done: string;
  /** «Presentar»: the player presents a certificate (scarecrows or stones). */
  readonly present: string;
}

/** A line that names, between «», the other word than the one on the level's button. */
export interface ButtonWordProblem {
  readonly code: 'buttonWord';
  readonly line: string;
  /** The word the level's button shows, which the line should say. */
  readonly shows: string;
}

/**
 * The lines of `level` that name the wrong button (GDD §5.2): «Terminé» in a level of certificates,
 * whose button says «Presentar», or «Presentar» where the button says "Terminé". The texts come
 * from the caller (`text`, by line id; levels never read the content), as do the two words. Only a
 * word between «» names the button: Bruto's "¡Terminé!" is just something he says.
 */
export function buttonWordProblems(
  level: LevelData,
  text: (id: string) => string | undefined,
  words: ButtonWords,
): ButtonWordProblem[] {
  const presents = level.victory !== undefined && isCertificate(level.victory);
  const [shows, other] = presents ? [words.present, words.done] : [words.done, words.present];
  return referencedLines(level)
    .filter((line) => text(line)?.includes(`«${other}»`) === true)
    .map((line) => ({ code: 'buttonWord', line, shows }));
}
