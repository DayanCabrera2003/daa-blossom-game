import { recordBetsWon, recordCompletion } from '@services/save';
import { betsWon } from '../../systems/betsWon';
import type { LevelScreen } from '../../systems/levelScreenOf';
import type { LevelSession } from '../../systems/levelSession';
import { pressLeave } from '../../systems/leaving';
import type { ToastView } from '../../view/ToastView';
import type { GameContext } from '../context';

/**
 * The way out of a level (GDD §5.2), as `systems/leaving.ts` decides it: with moves made, the
 * first press of «Volver» (or Escape) shows the notice and stays; a second press while it shows
 * leaves. Leaving saves the win of a play step already won whose script had not ended yet (not on
 * a screen that keeps no progress, the free mode), and logs a level left before its script ended as
 * left (on a screen that logs).
 */
export class LeaveGate {
  /** Until when the notice shows, on the context's clock; null before any warning. */
  private warnedUntil: number | null = null;

  /** The notice shows in `toast`; `screen` says what is kept and logged of level `levelId`. */
  constructor(
    private readonly context: GameContext,
    private readonly toast: ToastView,
    private readonly screen: LevelScreen,
    private readonly levelId: string,
  ) {}

  /** A press of the way out with `session` on screen: whether the level may be left now. */
  mayLeave(session: LevelSession): boolean {
    const { context, levelId } = this;
    const notice = context.t('leave.confirm');
    const press = pressLeave(session, this.warnedUntil, context.clock(), notice);
    if (press.kind === 'warn') {
      this.warnedUntil = press.until;
      this.toast.show(notice);
      return false;
    }
    const { win } = press;
    if (win !== null && this.screen.keepsProgress) {
      // The bets won give their seeds once, however often the level is won.
      const bets = betsWon(session);
      context.saves.update((save) =>
        recordBetsWon(recordCompletion(save, levelId, win.total), bets),
      );
    }
    if (session.won === null && this.screen.logsPlaytest) {
      const at = context.clock();
      const stars = win?.total ?? null;
      context.playtest.record([{ kind: 'levelEnd', at, level: levelId, outcome: 'left', stars }]);
    }
    return true;
  }
}
