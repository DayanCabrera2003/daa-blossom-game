import type Phaser from 'phaser';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import type { LineText } from '@services/lines';
import { planReplay, replayAt, type ReplayPlan } from '../animation/replay';
import {
  answerShowing,
  blocksInput,
  emptyStage,
  finishShowing,
  hintsShowBeside,
  present,
  type Presentation,
  type Stage,
  type StageTurn,
} from '../systems/presentation';
import type { Question } from '../systems/question';
import type { StarResult } from '../systems/stars';
import { fractionOfStep } from '../systems/sun';
import type { DialogueView } from '../view/DialogueView';
import type { QuestionView, ShownQuestion } from '../view/QuestionView';
import type { VeilView } from '../view/VeilView';

/** A day replaying itself on screen: its states, its timing, when it began and what shows now. */
interface Replaying {
  readonly day: readonly GardenState[];
  readonly plan: ReplayPlan;
  readonly startedAt: number;
  cursor: number;
}

/** The views the presenter opens items in. */
export interface PresenterViews {
  readonly dialogue: DialogueView;
  readonly question: QuestionView;
  readonly veil: VeilView;
}

/** The texts of the interface and of the level's lines. */
export interface PresenterTexts {
  readonly t: Translate;
  readonly line: LineText;
}

/** What the presenter asks of the level scene, which owns the garden and the panels. */
export interface PresenterHooks {
  /** Shows one state of a replayed day; null shows the player's own day again. */
  readonly showDay: (state: GardenState | null) => void;
  /** Ends any move animation still playing: a replay owns the garden from dawn. */
  readonly stopAnimation: () => void;
  /** Shows the victory panel. */
  readonly victory: (stars: StarResult) => void;
  /** The player chose an option (its value) of the question on screen. */
  readonly answer: (question: Question, value: number) => void;
}

/**
 * Shows the items of the presentation queue on the level screen, one at a time (plan 03, phases 3
 * and 4): lines in the dialogue box, a question in its panel (a bet maybe under the veil), the
 * replayed day on the garden, the victory panel. It opens each when the queue says so, and moves
 * the queue on when it is over. The order is decided by the pure queue (`systems/presentation.ts`);
 * this only carries it out.
 */
export class Presenter {
  private stage: Stage = emptyStage;
  /** The day replaying now, if any; while it plays, the garden takes no input. */
  private replaying: Replaying | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly views: PresenterViews,
    private readonly hooks: PresenterHooks,
    private readonly texts: PresenterTexts,
  ) {}

  /** Whether the player's input is held back now (while the day replays). */
  get blocksInput(): boolean {
    return blocksInput(this.stage);
  }

  /** Where the sun stands in the day replaying now, or null when nothing replays. */
  get replaySun(): { readonly fraction: number } | null {
    const { replaying } = this;
    return replaying === null
      ? null
      : { fraction: fractionOfStep(replaying.cursor, replaying.day.length) };
  }

  /** Queues an item to show on its own; it starts at once if nothing else is showing. */
  present(item: Presentation): void {
    this.start(present(this.stage, [item]));
  }

  /** The question on screen was answered: its panel (and a bet's veil) goes, and the queue moves on. */
  answered(): void {
    this.views.question.close();
    this.views.veil.uncover();
    this.start(answerShowing(this.stage));
  }

  /**
   * Shows the lines of a hint: beside an open question at once, otherwise in turn. `option` is the
   * option a grade-3 hint points at, marked on the question panel.
   */
  hint(lines: readonly string[], option: number | null): void {
    if (hintsShowBeside(this.stage)) this.views.dialogue.say(lines);
    else this.present({ kind: 'lines', lines });
    if (option !== null) this.views.question.mark(option);
  }

  /** Moves a replay on; called every frame by the scene. */
  update(time: number): void {
    if (this.replaying !== null) this.replayFrame(time);
  }

  /** Takes a turn of the queue and starts the item it puts on screen, if any. */
  private start({ stage, start }: StageTurn): void {
    this.stage = stage;
    if (start === null) return;
    switch (start.kind) {
      case 'lines':
        this.views.dialogue.say(start.lines, () => this.start(finishShowing(this.stage)));
        break;
      case 'replay':
        this.hooks.stopAnimation();
        this.replaying = {
          day: start.day,
          plan: planReplay(start.day.length),
          startedAt: this.scene.time.now,
          cursor: 0,
        };
        this.replayFrame(this.scene.time.now);
        break;
      case 'question':
        this.ask(start.question);
        break;
      case 'victory':
        this.hooks.victory(start.stars);
        break;
    }
  }

  /**
   * Opens the panel of a question. A bet with a preview first leaves the garden in view for that
   * long, then veils it while the player bets (1.6).
   */
  private ask(question: Question): void {
    const open = () => {
      if (question.preview !== null) this.views.veil.cover(this.texts.t('bet.veil'));
      this.views.question.show(this.shown(question), (value) => this.hooks.answer(question, value));
    };
    if (question.preview === null) open();
    else this.scene.time.delayedCall(question.preview, open);
  }

  /** A question in the player's words: its lines translated, numbers shown as themselves. */
  private shown(question: Question): ShownQuestion {
    const { t, line } = this.texts;
    return {
      prompt: line(question.prompt),
      footer: t(question.kind === 'bet' ? 'bet.choose' : 'question.choose'),
      options: question.options.map((option) => ({
        value: option.value,
        label: option.line === null ? String(option.value) : line(option.line),
      })),
    };
  }

  /**
   * Shows the state of the replayed day due at `time`; once dusk is reached, the garden shows the
   * player's real day again and the queue moves on.
   */
  private replayFrame(time: number): void {
    const replaying = this.replaying;
    if (replaying === null) return;
    const elapsed = time - replaying.startedAt;
    if (elapsed >= replaying.plan.duration) {
      this.replaying = null;
      this.hooks.showDay(null);
      this.start(finishShowing(this.stage));
      return;
    }
    replaying.cursor = replayAt(replaying.plan, elapsed);
    this.hooks.showDay(itemAt(replaying.day, replaying.cursor));
  }
}
