import { describe, expect, it } from 'vitest';
import { parseCodexEntry } from './codexEntry';

/** A well-formed entry, with what each test changes. */
const entry = ({
  head = '<!-- entry: C3 -->\n# El hilo ganador\n',
  intuition = '<!-- tab: intuition -->\nEl reflejo del estanque.\n',
  formal = '<!-- tab: formal -->\n## Lema de Berge\n\n**Teorema 3.2 (Berge, 1957).** Texto.\n',
  bridge = '<!-- tab: bridge -->\n**Nota histórica.** Berge.\n',
} = {}): string => head + intuition + formal + bridge;

describe('parseCodexEntry', () => {
  it('splits an entry into its id, its two titles and its three tabs', () => {
    expect(parseCodexEntry(entry())).toEqual({
      ok: true,
      value: {
        id: 'C3',
        gardenTitle: 'El hilo ganador',
        formalTitle: 'Lema de Berge',
        tabs: {
          intuition: 'El reflejo del estanque.',
          formal: '**Teorema 3.2 (Berge, 1957).** Texto.',
          bridge: '**Nota histórica.** Berge.',
        },
      },
    });
  });

  it('reads markers with any spacing and Windows line ends', () => {
    const source = entry({ head: '\n<!--entry:C3-->\r\n# El hilo ganador\r\n' });
    const parsed = parseCodexEntry(source.replaceAll('<!-- tab: ', '<!--   tab:'));
    expect(parsed.ok && parsed.value.gardenTitle).toBe('El hilo ganador');
  });

  it('names what is wrong with the entry marker', () => {
    expect(parseCodexEntry('# El hilo\n')).toEqual({ ok: false, error: { kind: 'noEntry' } });
    expect(parseCodexEntry(entry({ head: '<!-- entry: C15 -->\n# T\n' }))).toEqual({
      ok: false,
      error: { kind: 'unknownEntry', entry: 'C15' },
    });
    expect(parseCodexEntry(entry({ head: 'Hola\n<!-- entry: C3 -->\n# T\n' }))).toEqual({
      ok: false,
      error: { kind: 'noEntry' },
    });
    expect(parseCodexEntry(entry() + '<!-- entry: C4 -->\n')).toEqual({
      ok: false,
      error: { kind: 'extraEntry' },
    });
  });

  it('wants the garden title, alone, before the first tab', () => {
    for (const head of [
      '<!-- entry: C3 -->\n',
      '<!-- entry: C3 -->\n## El hilo\n',
      '<!-- entry: C3 -->\n# El hilo\nmás texto\n',
    ]) {
      expect(parseCodexEntry(entry({ head }))).toEqual({
        ok: false,
        error: { kind: 'noGardenTitle' },
      });
    }
  });

  it('names a tab that is missing, repeated, unknown, out of order or empty', () => {
    expect(parseCodexEntry(entry({ bridge: '' }))).toEqual({
      ok: false,
      error: { kind: 'missingTab', tab: 'bridge' },
    });
    expect(parseCodexEntry(entry() + '<!-- tab: bridge -->\nOtra.\n')).toEqual({
      ok: false,
      error: { kind: 'repeatedTab', tab: 'bridge' },
    });
    expect(parseCodexEntry(entry({ bridge: '<!-- tab: proof -->\nX\n' }))).toEqual({
      ok: false,
      error: { kind: 'unknownTab', tab: 'proof' },
    });
    const swapped = parseCodexEntry(
      '<!-- entry: C3 -->\n# T\n' +
        '<!-- tab: formal -->\n## F\nx\n<!-- tab: intuition -->\ny\n<!-- tab: bridge -->\nz\n',
    );
    expect(swapped).toEqual({ ok: false, error: { kind: 'tabsOutOfOrder' } });
    expect(parseCodexEntry(entry({ intuition: '<!-- tab: intuition -->\n  \n' }))).toEqual({
      ok: false,
      error: { kind: 'emptyTab', tab: 'intuition' },
    });
    expect(parseCodexEntry(entry({ formal: '<!-- tab: formal -->\n## Solo el título\n' }))).toEqual(
      { ok: false, error: { kind: 'emptyTab', tab: 'formal' } },
    );
  });

  it('wants the formal title first in the formal tab', () => {
    expect(parseCodexEntry(entry({ formal: '<!-- tab: formal -->\nTexto.\n## Tarde\n' }))).toEqual({
      ok: false,
      error: { kind: 'noFormalTitle' },
    });
  });
});
