// The heavy libraries that only the books use (plan 07, phase 2), and how to tell whether a built
// script bundles one: by a text of its own that minifiers keep, since a string is never renamed.

/** Each library that must stay out of the initial script, by a message only its code contains. */
export const DEFERRED_LIBRARIES = {
  katex: 'KaTeX parse error',
  marked: 'marked(): input parameter is undefined or null',
} as const;

/** The deferred libraries whose code is in `script`, in the order above. */
export function librariesIn(script: string): string[] {
  return Object.entries(DEFERRED_LIBRARIES)
    .filter(([, marker]) => script.includes(marker))
    .map(([name]) => name);
}
