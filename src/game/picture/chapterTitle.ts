import type { TextRef } from './hud';

/**
 * The chapters that have a name (GDD §6): El Huerto, El Prado, El Estanque. Each has its text
 * `hub.chapterName.<chapter>` in `content/`; the list of keys is built from this one.
 */
export const NAMED_CHAPTERS = ['0', '1', '2'] as const;

/**
 * What the hub writes over a chapter's levels: its name, or "Capítulo N" for a chapter whose levels
 * are only drafts so far (shown in teacher mode).
 */
export function chapterTitle(chapter: string): TextRef {
  return (NAMED_CHAPTERS as readonly string[]).includes(chapter)
    ? { key: `hub.chapterName.${chapter}`, params: {} }
    : { key: 'hub.chapter', params: { number: Number(chapter) } };
}
