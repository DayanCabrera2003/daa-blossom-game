/**
 * The structure of the formal tab of a Codex entry (plan 07, §1.1), for the content tests and the
 * book: its numbered results (`**Teorema 3.2 (Berge, 1957).**`) and whether each proof is closed
 * with $\blacksquare$, its links to entries and results (`[…](#C8)`, `[…](#C8-T8.1)`), and its
 * diagram blocks. Code blocks are skipped: what is written inside one is shown, never read.
 */

/** The kinds of numbered result, with the letter that names one in a link (`T8.1`). */
const KINDS = {
  Definición: 'D',
  Lema: 'L',
  Proposición: 'P',
  Teorema: 'T',
  Corolario: 'C',
  Observación: 'O',
  Algoritmo: 'A',
  Modelo: 'M',
} as const;

/** A kind of numbered result. */
export type ResultKind = keyof typeof KINDS;

/**
 * How a result is proved: `closed` (a proof that ends in $\blacksquare$), `open` (a proof that
 * never ends), `none` (no proof), or `outOfScope` (marked "(sin demostración: fuera de alcance)").
 */
export type ProofState = 'closed' | 'open' | 'none' | 'outOfScope';

/** A numbered result: `Teorema 3.2 (Berge, 1957)` is kind Teorema, entry 3, number 2. */
export interface CodexResult {
  readonly kind: ResultKind;
  readonly entry: number;
  readonly number: number;
  /** The name in brackets, or null when the result has none. */
  readonly name: string | null;
  readonly proof: ProofState;
}

/** A link to an entry (`#C8`, result null) or to one of its results (`#C8-T8.1`). */
export interface CodexLink {
  readonly entry: string;
  readonly result: string | null;
}

/** What a formal tab is made of. */
export interface CodexStructure {
  readonly results: readonly CodexResult[];
  readonly links: readonly CodexLink[];
  /** The JSON of each diagram block, as written. */
  readonly diagrams: readonly string[];
}

/** The heading of a result, opening its line: kind, entry, number, maybe a name, then the rest. */
const HEADING = new RegExp(
  `^\\*\\*(${Object.keys(KINDS).join('|')}) (\\d+)\\.(\\d+)(?: \\((.+?)\\))?\\.\\*\\*(.*)$`,
);

/** A link to an entry or a result. */
const LINK = /\]\(#(C\d+)(?:-([^)\s]+))?\)/g;

/** A fence that opens or closes a code block: its mark and what follows it (the language). */
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*(\S*)/;

/** How a result marks that its proof is left out. */
const OUT_OF_SCOPE = '(sin demostración: fuera de alcance)';

/** How a proof opens, and how it ends. */
const PROOF = '*Demostración.*';
const END = '$\\blacksquare$';

/** The name of a result in a link: its kind's letter and its number, `T8.1`. */
export const resultId = (result: Pick<CodexResult, 'kind' | 'entry' | 'number'>): string =>
  `${KINDS[result.kind]}${result.entry}.${result.number}`;

/** The proof state of a result, from its heading line and the text up to the next result. */
function proofOf(heading: string, body: string): ProofState {
  if (heading.includes(OUT_OF_SCOPE)) return 'outOfScope';
  const opens = body.indexOf(PROOF);
  if (opens < 0) return 'none';
  return body.includes(END, opens) ? 'closed' : 'open';
}

/** The structure of a formal tab (or any Markdown of the Codex). */
export function codexStructure(markdown: string): CodexStructure {
  const headings: { kind: ResultKind; entry: number; number: number; name: string | null }[] = [];
  const rests: string[] = [];
  const bodies: string[][] = [];
  const links: CodexLink[] = [];
  const diagrams: string[] = [];
  // The fence of the code block the scan is in, and the lines of a diagram block.
  let fence: string | null = null;
  let diagram: string[] | null = null;
  for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
    const mark = FENCE.exec(line);
    if (fence !== null) {
      // A fence closes with a bare run of its own mark, at least as long.
      const run = mark?.[2] === '' ? (mark[1] as string) : '';
      if (run[0] === fence[0] && run.length >= fence.length) {
        if (diagram !== null) diagrams.push(diagram.join('\n'));
        fence = null;
        diagram = null;
      } else diagram?.push(line);
      continue;
    }
    if (mark !== null) {
      fence = mark[1] as string;
      diagram = mark[2] === 'diagram' ? [] : null;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading !== null) {
      headings.push({
        kind: heading[1] as ResultKind,
        entry: Number(heading[2]),
        number: Number(heading[3]),
        name: heading[4] ?? null,
      });
      rests.push(heading[5] as string);
      bodies.push([]);
    } else bodies.at(-1)?.push(line);
    for (const link of line.matchAll(LINK)) {
      links.push({ entry: link[1] as string, result: link[2] ?? null });
    }
  }
  const results = headings.map((heading, i) => ({
    ...heading,
    proof: proofOf(rests[i] as string, (bodies[i] as string[]).join('\n')),
  }));
  return { results, links, diagrams };
}
