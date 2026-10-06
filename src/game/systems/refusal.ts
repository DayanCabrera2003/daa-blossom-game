import type { RejectReason } from '@core/rules/reasons';

/**
 * Why the level screen refused a move: a reason of the rules (`core/rules/reasons.ts`), or one of
 * the game's own. `notNow` is not a rule of the garden but of the level script: lanterns move only
 * while the script plays (plan 03, phase 2), so a move under a question changes nothing. Like every
 * refusal, it is answered with a gentle text, never a punishment.
 */
export type Refusal = RejectReason | { readonly code: 'notNow' };

/** The stable code of a refusal. */
export type RefusalCode = Refusal['code'];

/** A move made while the script is not playing. */
export const NOT_NOW: Refusal = { code: 'notNow' };
