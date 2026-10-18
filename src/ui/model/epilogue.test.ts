import type { CodexEntryId, CodexTab, OpenTabs } from '@levels/codex';
import { describe, expect, it } from 'vitest';
import { EPILOGUE_ENTRY, EPILOGUE_USES, epilogueChoices, paragraphsOf } from './epilogue';

/** The Codex with only `entries` open, each with its intuition tab. */
const opened = (...entries: CodexEntryId[]): OpenTabs =>
  new Map(entries.map((entry) => [entry, new Set<CodexTab>(['intuition'])]));

describe('what the epilogue offers', () => {
  it('reads the last entry of the Codex and goes back to the garden, nothing else today', () => {
    expect(epilogueChoices(opened('C14'), { sandbox: false })).toEqual([
      { choice: 'readCodex', label: 'epilogue.readCodex' },
      { choice: 'back', label: 'epilogue.back' },
    ]);
    expect(EPILOGUE_ENTRY).toBe('C14');
  });

  it('offers the free mode only once the game says it exists, before the way back', () => {
    expect(epilogueChoices(opened('C14'), { sandbox: true }).map((c) => c.choice)).toEqual([
      'readCodex',
      'sandbox',
      'back',
    ]);
  });

  it('never offers a page of the Codex that is still closed', () => {
    expect(epilogueChoices(opened('C13'), { sandbox: false }).map((c) => c.choice)).toEqual([
      'back',
    ]);
  });

  it('tells the three real uses in order: kidneys, molecules, pairs', () => {
    expect(EPILOGUE_USES).toEqual(['epilogue.kidneys', 'epilogue.molecules', 'epilogue.pairs']);
  });
});

describe('the paragraphs of a text', () => {
  it('splits at blank lines, trimming each paragraph and dropping empty ones', () => {
    expect(paragraphsOf('Uno.\n\n  Dos, con\nsalto.  \n\n\n\nTres.\n')).toEqual([
      'Uno.',
      'Dos, con\nsalto.',
      'Tres.',
    ]);
  });

  it('a text without blank lines is a single paragraph, and an empty one none', () => {
    expect(paragraphsOf('Solo uno.')).toEqual(['Solo uno.']);
    expect(paragraphsOf('  \n\n ')).toEqual([]);
  });
});
