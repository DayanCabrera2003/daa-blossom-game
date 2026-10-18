import { describe, expect, it } from 'vitest';
import { codexStructure, resultId, resultTitle } from './codexStructure';

const formal = [
  '**Definición 3.1 (camino).** Un camino es…',
  '',
  '**Lema 3.2.** Si $P$ es aumentante…',
  '',
  '*Demostración.* Por el [lema de la cadena](#C2-L2.3). $\\blacksquare$',
  '',
  '**Teorema 3.3 (Berge, 1957).** $M$ es máximo si y solo si…',
  '',
  '*Demostración.* Sin terminar, véase [C1](#C1).',
  '',
  '**Corolario 3.4 (Micali–Vazirani).** (sin demostración: fuera de alcance) Existe…',
  '',
  '**Proposición 3.5.** Sin prueba.',
  '',
  '```diagram',
  '{ "kind": "pond", "level": "2.1" }',
  '```',
  '',
  '```',
  '**Lema 9.9.** dentro de código, con [enlace](#C9)',
  '```',
  '',
  'Texto con **Lema 3.6.** en medio, que no abre un resultado.',
].join('\n');

describe('codexStructure', () => {
  const structure = codexStructure(formal);

  it('lists the numbered results in order, with their kind, number and name', () => {
    expect(
      structure.results.map(({ kind, entry, number, name }) => [kind, entry, number, name]),
    ).toEqual([
      ['Definición', 3, 1, 'camino'],
      ['Lema', 3, 2, null],
      ['Teorema', 3, 3, 'Berge, 1957'],
      ['Corolario', 3, 4, 'Micali–Vazirani'],
      ['Proposición', 3, 5, null],
    ]);
  });

  it('tells for each result whether its proof is closed, left open, missing or out of scope', () => {
    expect(structure.results.map((result) => result.proof)).toEqual([
      'none',
      'closed',
      'open',
      'outOfScope',
      'none',
    ]);
  });

  it('names each result the way links write it', () => {
    expect(structure.results.map(resultId)).toEqual(['D3.1', 'L3.2', 'T3.3', 'C3.4', 'P3.5']);
    expect(resultId({ kind: 'Observación', entry: 5, number: 5 })).toBe('O5.5');
    expect(resultId({ kind: 'Algoritmo', entry: 10, number: 1 })).toBe('A10.1');
    expect(resultId({ kind: 'Modelo', entry: 14, number: 2 })).toBe('M14.2');
  });

  it('reads back how the text writes the result a link names', () => {
    expect(resultTitle('T8.1')).toBe('Teorema 8.1');
    expect(resultTitle('D10.12')).toBe('Definición 10.12');
    expect(resultTitle('X8.1')).toBeNull();
    expect(resultTitle('T8')).toBeNull();
  });

  it('lists the links to entries and results, outside code', () => {
    expect(structure.links).toEqual([
      { entry: 'C2', result: 'L2.3' },
      { entry: 'C1', result: null },
    ]);
  });

  it('lists the diagram blocks as written', () => {
    expect(structure.diagrams).toEqual(['{ "kind": "pond", "level": "2.1" }']);
  });

  it('a text with none of them has none', () => {
    expect(codexStructure('Solo palabras.')).toEqual({ results: [], links: [], diagrams: [] });
  });

  it('a fence closes only with as long a run of its own mark', () => {
    const fenced =
      '````\n```\n**Lema 1.1.** dentro\n````\n**Lema 1.2.** fuera\n~~~diagram\n{}\n~~~';
    const found = codexStructure(fenced);
    expect(found.results.map(resultId)).toEqual(['L1.2']);
    expect(found.diagrams).toEqual(['{}']);
  });
});
