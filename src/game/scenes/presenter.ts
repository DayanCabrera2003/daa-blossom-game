import type Phaser from 'phaser';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import { planReplay, replayAt, type ReplayPlan } from '../animation/replay';
import {
  blocksInput,
  emptyStage,
  finishShowing,
  present,
  type Presentation,
  type Stage,
  type StageTurn,
} from '../systems/presentation';
import type { StarResult } from '../systems/stars';
import { fractionOfStep } from '../systems/sun';
import type { DialogueView } from '../view/DialogueView';

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
}

/** What the presenter asks of the level scene, which owns the garden and the panels. */
export interface PresenterHooks {
  /** Shows one state of a replayed day; null shows the player's own day again. */
  readonly showDay: (state: GardenState | null) => void;
  /** Ends any move animation still playing: a replay owns the garden from dawn. */
  readonly stopAnimation: () => void;
  /** Shows the victory panel. */
  readonly victory: (stars: StarResult) => void;
}

/**
 * Shows the items of the presentation queue on the level screen, one at a time (plan 03, phases 3
 * and 4): opens each in its view when the queue says so, and moves the queue on when it is over.
 * The order is decided by the pure queue (`systems/presentation.ts`); this only carries it out.
 */
export class Presenter {
  private stage: Stage = emptyStage;
  /** The day replaying now, if any; while it plays, the garden takes no input. */
  private replaying: Replaying | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly views: PresenterViews,
    private readonly hooks: PresenterHooks,
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
      case 'victory':
        this.hooks.victory(start.stars);
        break;
    }
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
