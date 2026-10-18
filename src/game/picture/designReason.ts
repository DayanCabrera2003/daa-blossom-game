import type { DesignRejection } from '@levels/sandbox/design';
import { MAX_SPROUTS, MAX_VINES } from '@levels/sandbox/limits';
import type { Translate } from '@services/i18n';

/**
 * Why the free mode's editor refused an edit, as the player reads it (GDD §2.10: the game refuses
 * and says why, never a code, never a punishment): the text of the reason, with the limit it ran
 * into when it is one of the free mode's counts.
 */
export function designReasonText(reason: DesignRejection, t: Translate): string {
  const key = `sandbox.reason.${reason}`;
  if (reason === 'tooMany') return t(key, { max: MAX_SPROUTS });
  if (reason === 'tooManyVines') return t(key, { max: MAX_VINES });
  return t(key);
}
