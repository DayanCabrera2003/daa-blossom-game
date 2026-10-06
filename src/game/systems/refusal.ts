import type { RejectReason } from '@core/rules/reasons';
import type { DraftRefusal } from '../input/mirrorDraft';

/**
 * Why the level screen refused a move: a reason of the rules (`core/rules/reasons.ts`), or one of
 * the game's own. `notNow` is not a rule of the garden but of the level script: lanterns move only
 * while the script plays (plan 03, phase 2), so a move under a question changes nothing. Like every
 * refusal, it is answered with a gentle text, never a punishment. A touch on the reflection drawn in
 * the mirror challenge (plan 03, phase 8) is no move either, but it may be refused too.
 */
export type Refusal = RejectReason | { readonly code: 'notNow' } | DraftRefusal;

/** The stable code of a refusal. */
export type RefusalCode = Refusal['code'];

/** A move made while the script is not playing. */
export const NOT_NOW: Refusal = { code: 'notNow' };
