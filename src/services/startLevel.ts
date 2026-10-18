import { codexEntry, codexTab } from '@levels/codex';
import type { BookRequest } from './busEvents';
import { isTeacherMode } from './teacherMode';

/**
 * The level to open straight away, from `?teacher&level=4.6` (GDD §5.8: teacher mode jumps to any
 * level). Players always start at the hub; an unknown level id is ignored.
 */
export function requestedLevel(search: string, levelIds: readonly string[]): string | null {
  if (!isTeacherMode(search)) return null;
  const id = new URLSearchParams(search).get('level');
  return id !== null && levelIds.includes(id) ? id : null;
}

/**
 * The Codex entry to open straight away, from `?teacher&codex=C8`, at the tab `&tab=formal` names
 * (`intuition`, `formal` or `bridge`), so a class can start on the page it is about. Only in teacher
 * mode, where every page is open; an unknown entry is ignored, and an unknown tab left out.
 */
export function requestedCodex(search: string): BookRequest | null {
  if (!isTeacherMode(search)) return null;
  const params = new URLSearchParams(search);
  const entry = codexEntry.safeParse(params.get('codex')?.toUpperCase());
  if (!entry.success) return null;
  const tab = codexTab.safeParse(params.get('tab'));
  return tab.success
    ? { book: 'codex', entry: entry.data, tab: tab.data }
    : { book: 'codex', entry: entry.data };
}
