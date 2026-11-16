import { describe, expect, it } from 'vitest';
import type { Shape } from './coverage';
import { dialogueAvoidance, namedLabels } from './dialogueAvoidance';

const box = (x: number): Shape => ({ kind: 'box', box: { x, y: 0, width: 10, height: 10 } });

describe('the sprouts a line names', () => {
  const labels = ['R', 'X', 'Y', 'a', 'b', 'd', 'a1', 'Cleo'];

  it('names a label written as a word of its own', () => {
    expect(namedLabels(['R lleva toda la noche a oscuras.'], labels)).toEqual(['R']);
    expect(namedLabels(['Llegaste a Cleo pidiendo. Mira d.'], labels)).toEqual(['d', 'Cleo']);
    expect(namedLabels(['Une b–a1, luego X.'], labels)).toEqual(['X', 'b', 'a1']);
  });

  it('never a label inside another word, nor in another case', () => {
    expect(namedLabels(['Rama, dedo, r'], labels)).toEqual([]);
  });

  it('never the words of one letter the language uses (a, e, o, u, y)', () => {
    expect(namedLabels(['Y al final, a oscuras.'], labels)).toEqual([]);
  });

  it('names nobody in a line without words', () => {
    expect(namedLabels(['…', ''], labels)).toEqual([]);
  });

  it('gathers the names of every line of a run', () => {
    expect(namedLabels(['Empieza por X.', 'Ahora R.'], labels)).toEqual(['R', 'X']);
  });
});

describe('what the dialogue box keeps clear of', () => {
  const sprouts = new Map([
    ['R', [box(0)]],
    ['X', [box(50)]],
  ]);
  const avoid = { shapes: [box(0), box(50), box(100)], referred: [box(100)], sprouts };

  it('the step’s own pieces and the sprouts its lines name, then every sprout, then the rest', () => {
    expect(dialogueAvoidance(avoid, ['Empieza por X.'])).toEqual({
      ...avoid,
      referred: [box(100), box(50)],
      kept: [box(0), box(50)],
    });
  });

  it('only the step’s pieces, then every sprout, when its lines name nobody', () => {
    expect(dialogueAvoidance(avoid, ['Hola.'])).toEqual({ ...avoid, kept: [box(0), box(50)] });
  });

  it('nothing more on a screen that tells no sprouts', () => {
    const bare = { shapes: [], referred: [] };
    expect(dialogueAvoidance(bare, ['Empieza por X.'])).toEqual(bare);
  });
});
