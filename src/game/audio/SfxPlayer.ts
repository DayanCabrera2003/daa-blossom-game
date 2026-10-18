import type Phaser from 'phaser';
import type { SoundCue } from '../systems/soundCues';
import type { AudioBus } from './AudioBus';

/**
 * Plays the sound cues of a scene on the effects channel (`systems/soundCues.ts` and
 * `systems/replayCues.ts` decide which and when; this only keeps the time). Cues are scheduled on
 * the scene's clock as an animation starts, so they pause with it; a new move cancels the ones
 * still waiting, as it cuts the animation short. A key no sound was loaded for is skipped by the
 * bus, so a cue whose file is not loaded (yet) simply plays nothing.
 */
export class SfxPlayer {
  private readonly waiting = new Set<Phaser.Time.TimerEvent>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bus: AudioBus,
  ) {
    // Leaving the scene drops what was still to sound in it.
    scene.events.once('shutdown', () => this.cancel());
  }

  /** Plays each cue `cue.at` ms from now, alongside any cue already waiting. */
  schedule(cues: readonly SoundCue[]): void {
    for (const cue of cues) {
      if (cue.at <= 0) {
        this.play(cue);
        continue;
      }
      const timer = this.scene.time.delayedCall(cue.at, () => {
        this.waiting.delete(timer);
        this.play(cue);
      });
      this.waiting.add(timer);
    }
  }

  /** Drops every cue still waiting: a new move has cut its animation short. */
  cancel(): void {
    for (const timer of this.waiting) timer.remove();
    this.waiting.clear();
  }

  private play(cue: SoundCue): void {
    this.bus.play('sfx', cue.key, { volume: cue.volume ?? 1 });
  }
}
