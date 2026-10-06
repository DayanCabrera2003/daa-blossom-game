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
