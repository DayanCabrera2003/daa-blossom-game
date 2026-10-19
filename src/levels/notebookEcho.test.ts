import { describe, expect, it } from 'vitest';
import { notebookEchoProblems, sharedRun } from './notebookEcho';
import type { LevelData } from './schema';

/** A level that says `before`, plays, then asks its notebook question with `right` as the answer. */
const levelAsking = (before: LevelData['flow'], after: LevelData['flow'] = []): LevelData =>
  ({
    id: '9.1',
    flow: [...before, { step: 'notebook', question: 0 }, ...after],
    hints: [{ line: 'ch9.1.sauce.07' }],
    notebook: [
      {
        prompt: 'ch9.1.notebook.00',
        codex: 'C2',
        options: [
          { line: 'ch9.1.notebook.01', correct: true, reply: 'ch9.1.sauce.06' },
          { line: 'ch9.1.notebook.02', correct: false },
        ],
      },
    ],
  }) as unknown as LevelData;

const texts: Record<string, string> = {
  'ch9.1.sauce.00': 'Plegar no crea ni destruye cadenas. Escríbelo en tu Cuaderno.',
  'ch9.1.sauce.01': 'Mira la flor con calma.',
  'ch9.1.sauce.02': 'Cada cadena, un farol.',
  'ch9.1.sauce.06': 'Eso es: no crea ni destruye cadenas.',
  'ch9.1.sauce.07': 'No crea ni destruye cadenas.',
  'ch9.1.notebook.00': 'Plegar una flor…',
  'ch9.1.notebook.01': '…no crea ni destruye cadenas.',
  'ch9.1.notebook.02': '…no crea ni destruye cadenas, pero puede esconder alguna.',
};
const text = (id: string): string | undefined => texts[id];

describe('sharedRun: three words in a row, two of them saying something', () => {
  it('finds a run written with other accents, case and punctuation', () => {
    expect(sharedRun('…no crea ni destruye cadenas.', 'Plegar no CREA, ni destruye nada')).toBe(
      'crea ni destruye',
    );
  });

  it('a run of filler words alone, or of only one word that says something, is no echo', () => {
    expect(sharedRun('…es uno de los que', 'y uno de los otros')).toBeNull();
    expect(sharedRun('…un farol nuevo', 'Cada cadena, un farol.')).toBeNull();
  });

  it('words split across a sentence are still words in a row', () => {
    expect(sharedRun('la base queda a oscuras', 'La base. Queda a oscuras.')).toBe('la base queda');
  });
});

describe('notebookEcho: the right statement never repeats a line just heard (plan 10, phase 6)', () => {
  it('flags the right statement that copies a line said before the notebook', () => {
    const level = levelAsking([
      { step: 'play', reactions: [] },
      { step: 'say', lines: ['ch9.1.sauce.00'] },
    ]);
    expect(notebookEchoProblems(level, text)).toEqual([
      {
        code: 'notebookEcho',
        question: 0,
        option: 0,
        echoes: 'ch9.1.sauce.00',
        words: 'crea ni destruye',
      },
    ]);
  });

  it('reactions while playing, and questions asked before, are heard too', () => {
    const reaction = levelAsking([
      { step: 'play', reactions: [{ on: 'lanterns', value: 2, say: ['ch9.1.sauce.00'] }] },
    ]);
    const asked = levelAsking([
      {
        step: 'ask',
        prompt: 'ch9.1.sauce.01',
        options: [{ line: 'ch9.1.sauce.00', correct: true }],
        retry: false,
      },
    ]);
    expect(notebookEchoProblems(reaction, text)).toHaveLength(1);
    expect(notebookEchoProblems(asked, text)).toHaveLength(1);
  });

  it('the summary as the reply, said after the notebook, or as a hint is no echo', () => {
    const level = levelAsking(
      [
        { step: 'say', lines: ['ch9.1.sauce.01'] },
        { step: 'play', reactions: [] },
      ],
      [{ step: 'say', lines: ['ch9.1.sauce.00'] }],
    );
    expect(notebookEchoProblems(level, text)).toEqual([]);
  });

  it('only the right statement is judged: a false one may copy on purpose', () => {
    const level = levelAsking([{ step: 'say', lines: ['ch9.1.sauce.02'] }]);
    expect(notebookEchoProblems(level, text)).toEqual([]);
  });

  it('a level without a notebook, or a line without a text, has nothing to echo', () => {
    const silent = { id: '9.1', flow: [{ step: 'play', reactions: [] }], hints: [] };
    expect(notebookEchoProblems(silent as unknown as LevelData, text)).toEqual([]);
    const level = levelAsking([{ step: 'say', lines: ['ch9.1.sauce.09'] }]);
    expect(notebookEchoProblems(level, () => undefined)).toEqual([]);
    const missing = { ...level, flow: [{ step: 'notebook', question: 3 }] } as LevelData;
    expect(notebookEchoProblems(missing, text)).toEqual([]);
    expect(notebookEchoProblems(level, text)).toEqual([]);
  });

  it('a second notebook question hears the lines said before its own step', () => {
    const level = {
      ...levelAsking([{ step: 'play', reactions: [] }]),
      flow: [
        { step: 'notebook', question: 0 },
        { step: 'say', lines: ['ch9.1.sauce.00'] },
        { step: 'notebook', question: 0 },
      ],
    } as unknown as LevelData;
    expect(notebookEchoProblems(level, text)).toEqual([
      expect.objectContaining({ question: 0, option: 0, echoes: 'ch9.1.sauce.00' }),
    ]);
  });
});

describe('a question of the script is held to the same rule (plan 10, phase 7)', () => {
  /** A level that says `before`, then asks with `ch9.1.notebook.01` as the right answer. */
  const asking = (before: LevelData['flow']): LevelData =>
    ({
      id: '9.1',
      hints: [],
      flow: [
        ...before,
        {
          step: 'ask',
          prompt: 'ch9.1.notebook.00',
          options: [
            { line: 'ch9.1.notebook.01', correct: true, reply: 'ch9.1.sauce.00' },
            { line: 'ch9.1.notebook.02', correct: false, reply: 'ch9.1.sauce.01' },
          ],
          retry: true,
        },
      ],
    }) as unknown as LevelData;

  it('flags the right answer that copies a line said before the question, by its step', () => {
    expect(
      notebookEchoProblems(asking([{ step: 'say', lines: ['ch9.1.sauce.07'] }]), text),
    ).toEqual([
      {
        code: 'askEcho',
        step: 1,
        option: 0,
        echoes: 'ch9.1.sauce.07',
        words: 'crea ni destruye',
      },
    ]);
  });

  it('its own reply, said after it, is no echo', () => {
    expect(
      notebookEchoProblems(asking([{ step: 'say', lines: ['ch9.1.sauce.01'] }]), text),
    ).toEqual([]);
  });
});
