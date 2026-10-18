/**
 * The garden to open the free mode with straight away, from a shared link `?garden=<code>` (plan
 * 08, section 1.3): the code as the address gives it (trimmed), or null when there is none. Unlike
 * `?level=`, it works for players too, since it is how a garden is shared. It is only looked for,
 * never decoded here: the garden-code decoder belongs to the free mode's own chunk, which reads the
 * code once it has loaded and tells the player kindly if it is broken. That keeps the decoder out
 * of the initial script.
 */
export function requestedGarden(search: string): string | null {
  const code = new URLSearchParams(search).get('garden')?.trim() ?? '';
  return code === '' ? null : code;
}
