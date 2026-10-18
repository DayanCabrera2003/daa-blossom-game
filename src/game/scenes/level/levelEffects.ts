import type { Level } from '@levels/build';
import type { Translate } from '@services/i18n';
import type { LineText } from '@services/lines';
import { planAnimation } from '../../animation/plan';
import { animationGarden } from '../../picture/animationGarden';
import { raceBetReveal } from '../../picture/raceBetReveal';
import { raceDurationAt } from '../../picture/racePanel';
import { checkText } from '../../picture/mirrorDrawing';
import { reasonText } from '../../picture/reasonText';
import type { AssetKey } from '../../assets/keys';
import { layerOf, type Controller, type Effect } from '../../systems/levelController';
import { automatonDayOf, garden } from '../../systems/levelSession';
import { lightDay } from '../../systems/lightSearch';
import { effectJingle } from '../../systems/musicFor';
import { questionAt } from '../../systems/question';
import { dayToReplay } from '../../systems/replayDay';
import { spokenLine } from '../../systems/speaker';
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
  /** Whether the game moves less now (the motion setting, plan 09 phase 6). */
  readonly moveLess: () => boolean;
  readonly toast: ToastView;
  readonly animation: AnimationView;
  readonly presenter: Presenter;
  /** Records the win; the victory panel waits its turn. */
  readonly win: (stars: StarResult) => void;
  /** Writes the level's statement in the player's notebook. */
  readonly writeNotebook: () => void;
  /** Rings a jingle over the music. */
  readonly jingle: (key: AssetKey) => void;
}

/**
 * Shows one effect of the level controller: a toast for a refusal, an animation for accepted
 * moves, an item for the presenter's queue (lines, a question, a replay, a counterexample, the
 * victory panel), or nothing at all when the garden painted from the session already shows it; a
 * bet won also rings its jingle (`systems/musicFor.ts`).
 */
export const showEffect = (effect: Effect, stage: EffectStage): void => {
  const { t, line } = stage;
  // A bet won rings its jingle as it is told.
  const jingle = effectJingle(effect);
  if (jingle !== null) stage.jingle(jingle);
  /** An interface text the mentor says, with its parameters. */
  const said = (key: string, params?: Readonly<Record<string, string | number>>) =>
    spokenLine(key, (id) => t(id, params));
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
        stage.presenter.present({ kind: 'lines', lines: [said('mirror.spared')] });
      break;
    }
    case 'flowerDrawn': {
      // A chain is cut over both gardens, painted from the session; a drawing that is no chain is
      // told why, and a player who cannot draw one is let go with a word from the mentor.
      const { attempt } = effect;
      if (attempt.kind === 'cut') break;
      const reason = { code: 'invalidPath', error: attempt.error } as const;
      stage.toast.show(reasonText(reason, { type: 'chain', path: attempt.path }, stage.labels, t));
      if (attempt.spared)
        stage.presenter.present({ kind: 'lines', lines: [said('flower.spared')] });
      break;
    }
    case 'animate':
      // Played where the layer entered draws the sprouts (5.2).
      stage.animation.play(
        planAnimation(effect.events, stage.moveLess()),
        animationGarden(stage.controller().session.history, layerOf(stage.controller())),
        stage.now(),
      );
      break;
    case 'hint': {
      const { content } = effect;
      stage.presenter.hint(
        [content.generic ? said(content.line) : spokenLine(content.line, line)],
        content.option,
      );
      break;
    }
    case 'say':
      stage.presenter.present({
        kind: 'lines',
        lines: effect.lines.map((id) => spokenLine(id, line)),
      });
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
    case 'automaton': {
      // The automaton's run is shown one move at a time, from the level's starting lanterns, with
      // the sun walking it; at the end, the presenter reports it and the session keeps it as a day.
      const day = automatonDayOf(stage.controller().session);
      if (day !== null) stage.presenter.present({ kind: 'replay', day, light: true });
      break;
    }
    case 'race':
      // The race runs on the panel, painted from the session and the presenter's clock; at its
      // end, the presenter reports it run.
      stage.presenter.present({
        kind: 'race',
        step: effect.step,
        duration: raceDurationAt(stage.level.flow, effect.step),
      });
      break;
    case 'raced': {
      // The bets this race settles are told, right or wrong, beside what was measured.
      const lines = effect.bets.flatMap((bet) => {
        const reveal = raceBetReveal(stage.level.flow, bet);
        if (reveal === null) return [];
        const params = Object.fromEntries(
          Object.entries(reveal.params).map(([name, key]) => [name, t(key)]),
        );
        return [said(reveal.key, params)];
      });
      if (lines.length > 0) stage.presenter.present({ kind: 'lines', lines });
      break;
    }
    case 'ordered': {
      // An order of the free mode: its day shown step by step with the sun walking it (a long run
      // of the gardener fits its time), then what is said of it, each line in its speaker's voice.
      const { day, within, lines } = effect;
      stage.presenter.present(
        within === null ? { kind: 'replay', day } : { kind: 'replay', day, within },
      );
      if (lines.length > 0) {
        stage.presenter.present({
          kind: 'lines',
          lines: lines.map(({ key, params, speaker }) => ({
            ...said(key, params),
            speaker: speaker ?? 'sauce',
          })),
        });
      }
      break;
    }
    case 'orderRefused':
      stage.toast.show(t(effect.text.key, effect.text.params));
      break;
    case 'won':
      stage.win(effect.stars);
      break;
    case 'ask':
    case 'bet':
    case 'count':
    case 'raceBet':
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
      stage.presenter.present({ kind: 'lines', lines: [spokenLine(effect.prompt, line)] });
      break;
    case 'vinePicked':
      // Nothing to queue: a right pick shows in the garden, painted from the session.
      break;
    case 'reveal': {
      const key = effect.bet === effect.right ? 'bet.revealRight' : 'bet.revealWrong';
      stage.presenter.present({
        kind: 'lines',
        lines: [said(key, { bet: effect.bet, count: effect.right })],
      });
      break;
    }
    case 'sameStones':
      // The council already knows these stones and says so in its own voice (7.6); the step
      // waits for others.
      stage.presenter.present({ kind: 'lines', lines: [spokenLine(effect.line, line)] });
      break;
    case 'play':
    case 'certifyAgain':
    case 'sproutTapped':
      // Nothing to draw: the garden simply takes moves, or the touched sprout is painted.
      break;
    case 'sun':
      // Nothing to draw: the sun is already on the top bar, and moving it ends the step.
      break;
    case 'counterexample': {
      const { question, option } = effect;
      stage.presenter.present({ kind: 'counterexample', question, option });
      break;
    }
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
    case 'recipe':
      // Nothing to queue: the recipe panel is painted from the session.
      break;
    case 'recipeChecked':
      // A wrong recipe is told on the panel, painted from the session; a right one closes it, so
      // it is told here.
      if (effect.verdict.right) stage.toast.show(t('recipe.right'));
      break;
  }
};
