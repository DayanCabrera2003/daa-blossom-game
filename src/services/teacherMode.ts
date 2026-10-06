/** Whether the page was opened in teacher mode (`?teacher` in the address, GDD §5.8). */
export function isTeacherMode(search: string): boolean {
  return new URLSearchParams(search).has('teacher');
}
