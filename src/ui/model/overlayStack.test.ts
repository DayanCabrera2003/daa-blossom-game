import { describe, expect, it } from 'vitest';
import { afterClose, afterShow } from './overlayStack';

type Shown = { readonly kind: 'book'; readonly name: string } | { readonly kind: 'epilogue' };

const codex: Shown = { kind: 'book', name: 'codex' };
const notebook: Shown = { kind: 'book', name: 'notebook' };
const epilogue: Shown = { kind: 'epilogue' };

describe('what the overlay layer shows after opening and closing', () => {
  it('a book opened over the garden is the only thing shown, and closing it leaves nothing', () => {
    const shown = afterShow<Shown>([], codex);
    expect(shown).toEqual([codex]);
    expect(afterClose(shown)).toEqual([]);
  });

  it('a book opened from the epilogue goes back to the epilogue when it closes', () => {
    const shown = afterShow<Shown>([epilogue], codex);
    expect(shown).toEqual([epilogue, codex]);
    expect(afterClose(shown)).toEqual([epilogue]);
    expect(afterClose(afterClose(shown))).toEqual([]);
  });

  it('a book opened from another book takes its place, keeping the epilogue under them', () => {
    expect(afterShow<Shown>([codex], notebook)).toEqual([notebook]);
    expect(afterShow<Shown>([epilogue, notebook], codex)).toEqual([epilogue, codex]);
  });

  it('the epilogue always starts afresh, on its own', () => {
    expect(afterShow<Shown>([codex], epilogue)).toEqual([epilogue]);
    expect(afterShow<Shown>([epilogue, codex], epilogue)).toEqual([epilogue]);
  });
});
