import type { KeyValueStore } from '@services/save';

/** An in-memory stand-in for localStorage, with its contents open to inspection. */
export const memoryStore = (
  initial: Record<string, string> = {},
): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};
