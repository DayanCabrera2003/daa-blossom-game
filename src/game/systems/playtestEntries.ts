import type { RejectReason } from '@core/rules/reasons';
import type { PlaytestEntry } from '@services/playtestLog';
import type { Controller, Step, UiEvent } from './levelController';

/** A refusal as one stable code, with the sub-reason of a bad chain or loop (`invalidPath.x`). */
const reasonCode = (reason: RejectReason): string =>
  'error' in reason ? `${reason.code}.${reason.error.code}` : reason.code;

/** The history moves worth logging, by the event that makes them. */
const HISTORY_MOVES = { undo: 'undo', redo: 'redo', seek: 'seek' } as const;

/**
 * What the playtest log records for one step of a level (GDD §10, Hito A): moves accepted and
 * refused, "Terminé" right or without reason, hints opened, trips through the day, and the win.
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
      case 'won':
        entries.push({ kind: 'levelEnd', at, level, outcome: 'won', stars: effect.stars.total });
        break;
    }
  }
  return entries;
}
