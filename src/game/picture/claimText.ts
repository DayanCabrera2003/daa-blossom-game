import type { ClaimVerdict } from '../systems/claimVerdict';
import type { TextRef } from './hud';

/**
 * The words of a claim that falls short (`systems/claimVerdict.ts`): a text of `strings.json` per
 * verdict (`claim.<code>`), with the counts it tells. None of them names a sprout or a vine: the
 * vine nobody guards is shown by its glow in the garden, never in words.
 */
export function claimText(verdict: ClaimVerdict): TextRef {
  const key = `claim.${verdict.code}`;
  switch (verdict.code) {
    case 'countMismatch':
      return { key, params: { scarecrows: verdict.scarecrows, lanterns: verdict.lanterns } };
    case 'countShort':
      return { key, params: { atLeast: verdict.atLeast, dark: verdict.dark } };
    default:
      return { key, params: {} };
  }
}
