/** Interface text by key, with `{name}` parameters (all visible text lives in `content/`). */
export type Translate = (key: string, params?: Readonly<Record<string, string | number>>) => string;

/** Marks a text that is missing, so a gap shows up on screen instead of breaking the game. */
export const missing = (key: string): string => `⟨${key}⟩`;

/**
 * A translator over a table of strings (e.g. `content/es/strings.json`). Parameters missing from
 * the call stay visible as `{name}`; a key missing from the table shows as `⟨key⟩`. Neither ever
 * throws: in a playtest a gap must be seen, not crash the level.
 */
export function createTranslator(strings: Readonly<Record<string, string>>): Translate {
  return (key, params = {}) => {
    const text = strings[key];
    if (text === undefined) return missing(key);
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}
