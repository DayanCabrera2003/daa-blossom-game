import type { Result } from '@core/shared/result';
import type { Design, DesignEdit, DesignRejection } from '@levels/sandbox/design';
import type { AssetKey } from '../assets/keys';

/**
 * The sound of each edit of the free mode's editor (plan 08, phase 11), from the effects the
 * levels already ring, so the editor answers the hand the way a garden does: water drops as a
 * sprout is planted or a vine grows, a lantern sparkles as it is lit, what is cut or taken away
 * goes out, and a refusal sounds the levels' gentle one. A move is quiet. Pure: the scene plays it.
 */

/** The sound generating a garden makes: it appears all at once, as a lantern lit does. */
export const GENERATED_SOUND: AssetKey = 'sfx.sparkle';

/** The sound of `edit` on `before`, as the reducer answered it, or null for none. */
export function designSound(
  edit: DesignEdit,
  before: Design,
  outcome: Result<Design, DesignRejection>,
): AssetKey | null {
  if (!outcome.ok) return 'sfx.reject';
  const after = outcome.value;
  switch (edit.type) {
    case 'addSprout':
      return 'sfx.waterDrop';
    case 'moveSprout':
      return null;
    case 'removeSprout':
      return 'sfx.putOut';
    case 'toggleVine':
      return after.vines.length > before.vines.length ? 'sfx.waterDrop' : 'sfx.putOut';
    case 'toggleLantern':
      return after.lanterns.length > before.lanterns.length ? 'sfx.sparkle' : 'sfx.putOut';
    case 'clear':
      return 'sfx.searchCleared';
  }
}
