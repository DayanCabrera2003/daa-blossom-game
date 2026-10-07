import { nameOf } from '@core/graph/labels';
import { itemAt } from '@core/shared/itemAt';
import type { PlaytestEntry } from '@services/playtestLog';
import type { Controller, Effect, Step, UiEvent } from './levelController';
import type { MirrorCheck } from './mirrorChallenge';
import type { Refusal } from './refusal';

/** A refusal as one stable code, with the sub-reason of a bad chain or loop (`invalidPath.x`). */
const reasonCode = (reason: Refusal): string =>
  'error' in reason ? `${reason.code}.${reason.error.code}` : reason.code;

/** The history moves worth logging, by the event that makes them. */
const HISTORY_MOVES = { undo: 'undo', redo: 'redo', seek: 'seek' } as const;

/**
 * An answer given to the script, logged by the kind of step that asked: an option of a question or
 * a number of a count, a bet (with whether it was informal), or a notebook statement.
 */
function answerEntry(
  before: Controller,
  answer: Extract<Effect, { readonly kind: 'answered' }>,
  at: number,
  level: string,
): PlaytestEntry {
  const step = itemAt(before.session.flow.steps, answer.step);
  const right = answer.correct;
  switch (step.step) {
    case 'bet':
      return { kind: 'bet', at, level, value: answer.value, right, informal: step.informal };
    case 'notebook':
      return { kind: 'notebook', at, level, option: answer.value, right };
    default:
      return { kind: 'answer', at, level, step: answer.step, option: answer.value, right };
  }
}

/**
 * A drawn reflection checked: whether it beats the garden, and whether it counts as an attempt
 * (a better reflection not checked before). Shared with the counterexample screen.
 */
export const mirrorCheckEntry = (check: MirrorCheck, at: number, level: string): PlaytestEntry => ({
  kind: 'mirrorCheck',
  at,
  level,
  beats: check.kind === 'better',
  counted: check.kind === 'better' && check.fresh,
});

/**
 * What the playtest log records for one step of a level (GDD §10, Hito A): moves accepted and
 * refused, "Terminé" right or without reason, hints opened, trips through the day, answers, bets
 * and notebook choices, vines pointed at, the counterexamples they open, reflections checked, and
 * the win. A counterexample is logged when the script opens it: the screen shows it in its turn,
 * after any lines before it.
 * Pointing, dragging and choosing tools are not recorded, nor history moves that go nowhere.
 * Pure: `before` is the controller the event reached, `step` what it answered, `at` the clock.
 */
export function playtestEntries(
  before: Controller,
  event: UiEvent,
  step: Step,
  at: number,
): PlaytestEntry[] {
  const level = before.session.level.data.id;
  const after = step.controller.session;
  const entries: PlaytestEntry[] = [];

  if (event.kind === 'undo' || event.kind === 'redo' || event.kind === 'seek') {
    if (after.history.cursor !== before.session.history.cursor) {
      entries.push({ kind: 'history', at, level, move: HISTORY_MOVES[event.kind] });
    }
  }
  for (const effect of step.effects) {
    switch (effect.kind) {
      case 'hint':
        entries.push({ kind: 'hint', at, level, grade: after.hints.opened });
        break;
      case 'rejected':
        entries.push({
          kind: 'refused',
          at,
          level,
          action: effect.action.type,
          reason: reasonCode(effect.reason),
        });
        break;
      case 'animate':
        entries.push({ kind: 'move', at, level, action: effect.action.type });
        if (effect.action.type === 'declareDone') {
          const right = after.claims.right > before.session.claims.right;
          entries.push({ kind: 'claim', at, level, right });
        }
        break;
      case 'answered':
        entries.push(answerEntry(before, effect, at, level));
        break;
      case 'vinePicked': {
        const name = (v: number): string => nameOf(before.session.level.labels, v);
        const { step: index, u, v, correct } = effect;
        entries.push({
          kind: 'pickVine',
          at,
          level,
          step: index,
          vine: [name(u), name(v)],
          right: correct,
        });
        break;
      }
      case 'counterexample':
        entries.push({ kind: 'counterexample', at, level, option: effect.option });
        break;
      case 'mirrorChecked':
        entries.push(mirrorCheckEntry(effect.check, at, level));
        break;
      case 'won':
        entries.push({ kind: 'levelEnd', at, level, outcome: 'won', stars: effect.stars.total });
        break;
    }
  }
  return entries;
}
