// The review sheet of the Spanish lines (plan 09, phase 11; appendix A, question 12): every
// dialogue line of the game, level by level in the order of the script, with who says it and
// whether the GDD quotes the whole line word for word or a plan wrote it, each with a box to tick; and
// after them the texts of the page and its notices, which no GDD sentence gives. Pure: it takes the
// texts and returns the Markdown; `line-sheet.ts` writes it to docs/review/lineas.md.
import { compareLevelIds } from '@levels/catalog';
import { speakerOf } from '@game/systems/speaker';

/** What the sheet is made from. */
export interface LineSheetSources {
  /** `content/es/lines.json`: the dialogue lines by id. */
  readonly lines: Readonly<Record<string, string>>;
  /** `content/es/strings.json`: the interface texts, for the speakers' names and the page's texts. */
  readonly strings: Readonly<Record<string, string>>;
  /** `docs/GDD.md`, where a sentence given word for word is looked for. */
  readonly gdd: string;
}

/**
 * The interface texts the sheet also lists (plan 09, decision on phase 10): the notices of the
 * page and the texts of its head, its `<noscript>` and its 404 page, all written by plan 09.
 */
export const PAGE_TEXT_PREFIXES = ['notice.', 'page.'] as const;

/** A dialogue line id: chapter and level, then the speaker and the number of the line. */
const LINE_ID = /^ch(\d+\.\d+)\.[a-z]+\.(\d+)$/;

/**
 * Text as compared with the GDD: without Markdown's emphasis, with every quotation mark written
 * as a straight one (the GDD quotes with `"`, the game's lines with « » inside a line) and with
 * single spaces.
 */
const plain = (text: string): string =>
  text
    .replace(/[*`]/g, '')
    .replace(/[«»“”„]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** One row of the sheet: a box, the id, who says it, where the sentence comes from, the text. */
const row = (id: string, who: string, fromGdd: boolean, text: string): string =>
  `- [ ] \`${id}\` · **${who}** · ${fromGdd ? 'GDD' : 'plan'}: ${text}`;

/** The level and the number of a line id; lines of an unknown shape go last, by id. */
function placeOf(id: string): { level: string; number: number } {
  const match = LINE_ID.exec(id);
  return { level: match?.[1] ?? '?', number: Number(match?.[2] ?? 0) };
}

/** The review sheet, in Markdown. */
export function lineSheet({ lines, strings, gdd }: LineSheetSources): string {
  const book = plain(gdd);
  // A sentence comes from the GDD only when the GDD quotes the whole line, from its opening mark
  // to its closing one: a short line that is only a phrase inside a longer quote ("Uno." in "Ni
  // dos ni medio. Uno.") or loose words of the prose do not count.
  const fromGdd = (text: string): boolean => book.includes(`"${plain(text)}"`);
  const nameOf = (id: string): string => strings[`speaker.${speakerOf(id)}`] ?? speakerOf(id);

  const ids = Object.keys(lines).sort((a, b) => {
    const [one, other] = [placeOf(a), placeOf(b)];
    return compareLevelIds(one.level, other.level) || one.number - other.number || (a < b ? -1 : 1);
  });
  const total = ids.length;
  const given = ids.filter((id) => fromGdd(lines[id] ?? '')).length;

  const out: string[] = [
    '# Hoja de líneas para revisar',
    '',
    '> Generada por `npm run lines` desde `src/content/es/lines.json`, `strings.json` y `docs/GDD.md`; no se edita a mano. Plan 09, fase 11 (Apéndice A, pregunta 12).',
    '',
    `Cada línea de diálogo del juego, nivel por nivel y en el orden del guion: su id, quién la dice, de dónde sale la frase y el texto. **GDD**: el GDD cita la línea entera tal cual, entre comillas (sin contar el tipo de comillas ni los espacios; una frase corta dentro de una cita más larga no cuenta); **plan**: la escribió un plan. De ${total} líneas, ${given} están tal cual en el GDD y ${total - given} las escribió un plan. Se marca la casilla de cada línea revisada; un cambio se anota debajo de la línea y se pasa a \`lines.json\` en su propio commit.`,
  ];
  let chapter = '';
  let level = '';
  for (const id of ids) {
    const place = placeOf(id).level;
    const chapterNow = place.split('.')[0] ?? place;
    if (chapterNow !== chapter) {
      chapter = chapterNow;
      out.push('', `## Capítulo ${chapter}`);
    }
    if (place !== level) {
      level = place;
      out.push('', `### ${level}`, '');
    }
    const text = lines[id] ?? '';
    out.push(row(id, nameOf(id), fromGdd(text), text));
  }

  out.push(
    '',
    '## Textos de la página y avisos',
    '',
    'Los escribió el plan 09 (fases 7 y 10): el aviso de girar el teléfono, los avisos de un fallo al cargar y del almacenamiento, la descripción de la página, el texto sin JavaScript y la página 404. Se quedan como están hasta que el autor los revise aquí.',
    '',
  );
  for (const [key, text] of Object.entries(strings)) {
    if (PAGE_TEXT_PREFIXES.some((prefix) => key.startsWith(prefix)))
      out.push(row(key, 'Página', fromGdd(text), text));
  }
  return `${out.join('\n')}\n`;
}
