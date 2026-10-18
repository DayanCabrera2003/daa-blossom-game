import { decodeGarden } from '@core/codes/gardenCode';

/**
 * The garden to open the free mode with straight away, from a shared link `?garden=<code>` (plan
 * 08, section 1.3): the code when it is a garden code, or null. Unlike `?level=`, it works for
 * players too, since it is how a garden is shared. A broken code is ignored and the game starts as
 * usual; the free mode itself holds the garden to its limits when it opens it.
 */
export function requestedGarden(search: string): string | null {
  const code = new URLSearchParams(search).get('garden');
  return code !== null && decodeGarden(code).ok ? code : null;
}
