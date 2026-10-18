import { describe, expect, it } from 'vitest';
import { codexGlossary } from './glossary';

describe('codexGlossary', () => {
  it('bundles the glossary of C13, parsed once', () => {
    const glossary = codexGlossary();
    expect(glossary.rows[0]?.entry).toBe('C1');
    expect(codexGlossary('es')).toBe(glossary);
  });
});
