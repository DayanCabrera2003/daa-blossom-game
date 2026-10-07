import type { Level } from '@levels/build';
import type { Translate } from '@services/i18n';
import type { LineText } from '@services/lines';
import { planAnimation } from '../../animation/plan';
import { checkText } from '../../picture/mirrorDrawing';
import { reasonText } from '../../picture/reasonText';
import { layerOf, type Controller, type Effect } from '../../systems/levelController';
import { garden } from '../../systems/levelSession';
import { lightDay } from '../../systems/lightSearch';
import { questionAt } from '../../systems/question';
import { dayToReplay } from '../../systems/replayDay';
import type { StarResult } from '../../systems/stars';
import type { AnimationView } from '../../view/AnimationView';
import type { ToastView } from '../../view/ToastView';
import type { Presenter } from '../presenter';

/** Where the effects of the level controller are shown, and what they are read against. */
export interface EffectStage {
  readonly level: Level;
  /** The sprouts' names, for the texts that name them. */
  readonly labels: readonly string[];
  readonly t: Translate;
  readonly line: LineText;
  /** The controller as it is now, after the event that brought the effect. */
  readonly controller: () => Controller;
  /** The scene's clock, in milliseconds. */
  readonly now: () => number;
  readonly toast: ToastView;
  readonly animation: AnimationView;
  readonly presenter: Presenter;
  /** Records the win; the victory panel waits its turn. */
  readonly win: (stars: StarResult) => void;
  /** Writes the level's statement in the player's notebook. */
  readonly writeNotebook: () => void;
}

/**
 * Shows one effect of the level controller: a toast for a refusal, an animation for accepted
 * moves, an item for the presenter's queue (lines, a question, a replay, a counterexample, the
 * victory panel), or nothing at all when the garden painted from the session already shows it.
 */
export const showEffect = (effect: Effect, stage: EffectStage): void => {
  const { t, line } = stage;
  switch (effect.kind) {
    case 'rejected': {
      // Before folding opens, the conflict of a search is not told apart (4.1).
      const foldAllowed = stage.level.start.allowed.has('foldAt');
      stage.toast.show(reasonText(effect.reason, effect.action, stage.labels, t, { foldAllowed }));
      break;
    }
    case 'drawRefused':
      stage.toast.show(reasonText(effect.reason, null, stage.labels, t));
      break;
    case 'mirrorChecked': {
      // What the check found is painted from the session; here it is told, and a player who
      // could not beat the garden is let go with a word from the mentor.
      const { key, params } = checkText(effect.check);
      stage.toast.show(t(key, params));
      if (effect.check.kind === 'notBetter' && effect.check.spared)
        stage.presenter.present({ kind: 'lines', lines: [t('mirror.spared')] });
      break;
    }
    case 'flowerDrawn': {
      // A chain is cut over both gardens, painted from the session; a drawing that is no chain is
      // told why, and a player who cannot draw one is let go with a word from the mentor.
      const { attempt } = effect;
      if (attempt.kind === 'cut') break;
      const reason = { code: 'invalidPath', error: attempt.error } as const;
      stage.toast.show(reasonText(reason, { type: 'chain', path: attempt.path }, stage.labels, t));
      if (attempt.spared) stage.presenter.present({ kind: 'lines', lines: [t('flower.spared')] });
      break;
    }
    case 'animate':
      // Played where the layer entered draws the sprouts (5.2).
      stage.animation.play(
        planAnimation(effect.events),
        layerOf(stage.controller()).positions,
        stage.now(),
      );
      break;
    case 'hint': {
      const { content } = effect;
      stage.presenter.hint(
        [content.generic ? t(content.line) : line(content.line)],
        content.option,
      );
      break;
    }
    case 'say':
      stage.presenter.present({ kind: 'lines', lines: effect.lines.map(line) });
      break;
    case 'replay': {
      const { level, history } = stage.controller().session;
      const day = dayToReplay(level, history.states, effect.demo);
      stage.presenter.present({ kind: 'replay', day });
      break;
    }
    case 'autoSearch':
      // The light's marks are shown one by one from the garden as it is now; at the end, the
      // presenter reports it and the session keeps them.
      stage.presenter.present({
        kind: 'replay',
        day: lightDay(garden(stage.controller().session)),
        light: true,
      });
      break;
    case 'won':
      stage.win(effect.stars);
      break;
    case 'ask':
    case 'bet':
    case 'count':
    case 'notebook': {
      // The options and right answers come from the core, on the garden as it is now.
      const yours = garden(stage.controller().session);
      const question = questionAt(stage.level, effect.step, yours);
      if (question !== null) stage.presenter.present({ kind: 'question', question });
      break;
    }
    case 'answered':
      stage.presenter.answered();
      break;
    case 'pickVine':
      // The mentor asks; the touch on a vine that answers goes through the controller.
      stage.presenter.present({ kind: 'lines', lines: [line(effect.prompt)] });
      break;
    case 'vinePicked':
      // Nothing to queue: a right pick shows in the garden, painted from the session.
      break;
    case 'reveal': {
      const key = effect.bet === effect.right ? 'bet.revealRight' : 'bet.revealWrong';
      stage.presenter.present({
        kind: 'lines',
        lines: [t(key, { bet: effect.bet, count: effect.right })],
      });
      break;
    }
    case 'play':
    case 'sproutTapped':
      // Nothing to draw: the garden simply takes moves, or the touched sprout is painted.
      break;
    case 'sun':
      // Nothing to draw: the sun is already on the top bar, and moving it ends the step.
      break;
    case 'counterexample':
      stage.presenter.present({ kind: 'counterexample', option: effect.option });
      break;
    case 'written':
      stage.writeNotebook();
      break;
    case 'mirror':
    case 'explore':
    case 'separate':
    case 'draw':
      // Nothing to queue: the pond, and the reflection drawn in it, are painted from the session.
      break;
    case 'flowerChallenge':
      // Nothing to queue: the open and the folded garden are painted from the session.
      break;
  }
};
