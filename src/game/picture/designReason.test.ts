import strings from '@content/es/strings.json';
import type { DesignRejection } from '@levels/sandbox/design';
import { MAX_SPROUTS, MAX_VINES } from '@levels/sandbox/limits';
import { createTranslator, missing } from '@services/i18n';
import { describe, expect, it } from 'vitest';
import { MATHEMATICS } from '../../../tests/support/vocabulary';
import { designReasonText } from './designReason';

const t = createTranslator(strings);

/** Every way the editor's reducer refuses an edit. */
const REJECTIONS: readonly DesignRejection[] = [
  'tooMany',
  'tooManyVines',
  'tooClose',
  'outside',
  'sproutBusy',
  'notAVine',
  'noSprout',
  'sameSprout',
];

describe("why the editor refuses an edit, in the garden's words", () => {
  it('every refusal has a text, and none names the mathematics', () => {
    for (const reason of REJECTIONS) {
      const said = designReasonText(reason, t);
      expect({ reason, untold: said === missing(`sandbox.reason.${reason}`) }).toEqual({
        reason,
        untold: false,
      });
      expect(MATHEMATICS.test(said)).toBe(false);
    }
  });

  it('a limit reached says the limit', () => {
    expect(designReasonText('tooMany', t)).toContain(String(MAX_SPROUTS));
    expect(designReasonText('tooManyVines', t)).toContain(String(MAX_VINES));
  });
});
