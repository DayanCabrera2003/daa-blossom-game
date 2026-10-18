// The sheet of the lines changed since version 1.0.1 (plan 10, phase 0): every dialogue line that
// is new, changed or removed, level by level in the order of the script, with who says it, its
// text before and after and a box to tick; and after them every interface text that is new,
// changed or removed. The author reads it before version 1.1.0, since the plan's sentences are
// drafts. Pure: it takes today's texts and the base and returns the Markdown; `line-sheet.ts`
// writes it to docs/review/lineas-plan10.md.
import { speakerOf } from '@game/systems/speaker';
import { compareLineIds, placeOf } from './lineOrder';

/** A table of texts by id, as `lines.json` and `strings.json` hold them. */
type Texts = Readonly<Record<string, string>>;

/** What the sheet is made from: today's texts and the copies of version 1.0.1. */
export interface ChangeSheetSources {
  /** `content/es/lines.json` today. */
  readonly lines: Texts;
  /** `content/es/strings.json` today, also for the speakers' names. */
  readonly strings: Texts;
  /** `lines.json` at the tag v1.0.1 (`tools/review/baseline/`). */
  readonly baseLines: Texts;
  /** `strings.json` at the tag v1.0.1 (`tools/review/baseline/`). */
  readonly baseStrings: Texts;
}

/** How a text differs from the base. */
type Change = 'nueva' | 'cambiada' | 'retirada';

/** One text that differs from the base: its id, the kind of change and its two versions. */
interface Difference {
  readonly id: string;
  readonly change: Change;
  readonly before: string | undefined;
  readonly after: string | undefined;
}

/**
 * The texts that differ between `base` and `now`: today's in their order, then the removed ones in
 * the order of the base. A text whose words are the same is left out.
 */
function differences(now: Texts, base: Texts): Difference[] {
  const found: Difference[] = [];
  for (const [id, after] of Object.entries(now)) {
    const before = base[id];
    if (before === after) continue;
    found.push({ id, change: before === undefined ? 'nueva' : 'cambiada', before, after });
  }
  for (const [id, before] of Object.entries(base)) {
    if (!(id in now)) found.push({ id, change: 'retirada', before, after: undefined });
  }
  return found;
}

/** The rows of one difference: the box with the id (and who says it), then before and after. */
function rowsOf({ id, change, before, after }: Difference, who?: string): string[] {
  const rows = [`- [ ] \`${id}\`${who === undefined ? '' : ` · **${who}**`} · ${change}`];
  if (before !== undefined) rows.push(`  - Antes: ${before}`);
  if (after !== undefined) rows.push(`  - Después: ${after}`);
  return rows;
}

/** The sheet of changes, in Markdown. */
export function changeSheet({
  lines,
  strings,
  baseLines,
  baseStrings,
}: ChangeSheetSources): string {
  const nameOf = (id: string): string =>
    strings[`speaker.${speakerOf(id)}`] ?? baseStrings[`speaker.${speakerOf(id)}`] ?? speakerOf(id);
  const spoken = differences(lines, baseLines).sort((a, b) => compareLineIds(a.id, b.id));
  const shown = differences(strings, baseStrings);

  const out: string[] = [
    '# Hoja de cambios de líneas (Plan 10)',
    '',
    '> Generada por `npm run lines` desde `src/content/es/lines.json` y `strings.json`, comparados con sus copias de la versión 1.0.1 (`tools/review/baseline/`); no se edita a mano. Plan 10, fase 0.',
    '',
    'Cada línea de diálogo y cada texto de interfaz **nuevo**, **cambiado** o **retirado** desde la versión 1.0.1, con su texto de antes y de después. Las frases del Plan 10 son borradores: se marca la casilla de cada una revisada, un cambio se anota debajo y se pasa a `lines.json` o `strings.json` en su propio commit.',
  ];
  if (spoken.length === 0 && shown.length === 0) {
    out.push('', 'Sin cambios desde la versión 1.0.1.');
    return `${out.join('\n')}\n`;
  }
  out.push(
    '',
    `${spoken.length} líneas de diálogo y ${shown.length} textos de interfaz distintos de la versión 1.0.1.`,
  );

  let level = '';
  for (const difference of spoken) {
    const place = placeOf(difference.id).level;
    if (place !== level) {
      level = place;
      out.push('', `### ${level}`, '');
    }
    out.push(...rowsOf(difference, nameOf(difference.id)));
  }

  out.push('', '## Textos de interfaz', '');
  if (shown.length === 0) out.push('Sin cambios.');
  for (const difference of shown) out.push(...rowsOf(difference));
  return `${out.join('\n')}\n`;
}
