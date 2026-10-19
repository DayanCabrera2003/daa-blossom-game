import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import baseLines from '../tools/review/baseline/lines-1.0.1.json';
import baseStrings from '../tools/review/baseline/strings-1.0.1.json';
import { changeSheet } from '../tools/review/changeSheet';

// The sheet of the lines changed since version 1.0.1 (plan 10, phase 0): every dialogue line and
// interface text that is new, changed or removed, with its before and after, for the author to
// read before version 1.1.0; and the sheet in docs/review/ is the one the texts give today.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

/** The sheet of some sample texts against a sample base. */
const sample = changeSheet({
  lines: {
    'ch1.1.sauce.00': 'Igual que antes.',
    'ch1.2.sauce.00': 'Después de cambiar.',
    'ch1.10.bruto.03': 'Una línea nueva.',
    'ch1.2.sauce.01': 'Otra nueva, más tarde en 1.2.',
  },
  baseLines: {
    'ch1.1.sauce.00': 'Igual que antes.',
    'ch1.2.sauce.00': 'Antes de cambiar.',
    'ch1.9.sauce.00': 'Una línea retirada.',
  },
  strings: {
    'speaker.bruto': 'Bruto',
    'hud.same': 'Igual',
    'hud.done': 'Presentar',
    'hud.new': 'Nueva',
  },
  baseStrings: {
    'speaker.bruto': 'Bruto',
    'hud.same': 'Igual',
    'hud.done': 'Terminé',
    'hud.gone': 'Fuera',
  },
});
const sampleRows = sample.split('\n');

/** The position of the first row that mentions `text`. */
const at = (text: string): number => sampleRows.findIndex((row) => row.includes(text));

describe('the sheet of the lines changed since version 1.0.1', () => {
  it('lists a changed, a new and a removed line with their before and after', () => {
    const changed = at('`ch1.2.sauce.00`');
    expect(sampleRows[changed]).toContain('cambiada');
    expect(sampleRows[changed + 1]).toContain('Antes de cambiar.');
    expect(sampleRows[changed + 2]).toContain('Después de cambiar.');
    expect(sampleRows[at('`ch1.10.bruto.03`')]).toContain('nueva');
    expect(sampleRows[at('`ch1.10.bruto.03`')]).toContain('**Bruto**');
    expect(sampleRows[at('`ch1.10.bruto.03`') + 1]).toContain('Una línea nueva.');
    expect(sampleRows[at('`ch1.9.sauce.00`')]).toContain('retirada');
    expect(sampleRows[at('`ch1.9.sauce.00`') + 1]).toContain('Una línea retirada.');
  });

  it('keeps the order of the script, level by level', () => {
    expect(at('### 1.2')).toBeLessThan(at('`ch1.2.sauce.00`'));
    expect(at('`ch1.2.sauce.00`')).toBeLessThan(at('`ch1.2.sauce.01`'));
    expect(at('`ch1.2.sauce.01`')).toBeLessThan(at('### 1.9'));
    expect(at('### 1.9')).toBeLessThan(at('### 1.10'));
  });

  it('lists the interface texts that changed in their own section', () => {
    const section = at('## Textos de interfaz');
    expect(section).toBeGreaterThan(at('`ch1.10.bruto.03`'));
    expect(at('`hud.done`')).toBeGreaterThan(section);
    expect(sampleRows[at('`hud.done`') + 1]).toContain('Terminé');
    expect(sampleRows[at('`hud.done`') + 2]).toContain('Presentar');
    expect(sampleRows[at('`hud.new`')]).toContain('nueva');
    expect(sampleRows[at('`hud.gone`')]).toContain('retirada');
  });

  it('leaves out the texts that did not change', () => {
    expect(sample).not.toContain('ch1.1.sauce.00');
    expect(sample).not.toContain('hud.same');
    expect(sample).not.toContain('speaker.bruto');
  });

  it('says there is nothing to review when nothing changed', () => {
    const none = changeSheet({ lines: {}, baseLines: {}, strings: {}, baseStrings: {} });
    expect(none).toContain('Sin cambios');
    expect(none).not.toContain('- [ ]');
  });

  it('keeps the base exactly as the texts of the tag v1.0.1', () => {
    const tagged = (path: string): string | undefined => {
      try {
        return execFileSync('git', ['show', `v1.0.1:${path}`], { encoding: 'utf8' });
      } catch {
        // Without git or without the tag (a copy of the sources), there is nothing to compare.
        return undefined;
      }
    };
    for (const [base, source] of [
      ['../tools/review/baseline/lines-1.0.1.json', 'src/content/es/lines.json'],
      ['../tools/review/baseline/strings-1.0.1.json', 'src/content/es/strings.json'],
    ] as const) {
      const original = tagged(source);
      if (original !== undefined) expect(read(base)).toBe(original);
    }
  });

  it('is up to date in docs/review/lineas-plan10.md (npm run lines writes it)', () => {
    expect(read('../docs/review/lineas-plan10.md')).toBe(
      changeSheet({ lines, strings, baseLines, baseStrings }),
    );
  });
});
