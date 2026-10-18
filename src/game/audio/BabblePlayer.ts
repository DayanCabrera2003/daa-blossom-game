import type Phaser from 'phaser';
import { contextOf, type GameContext } from '../scenes/context';
import type { Syllable } from '../systems/babble';
import type { AudioBus, BusSound } from './AudioBus';

/** How long a syllable takes to fade out when the next one of its voice, or silence, cuts it. */
const FADE = 15;

/** A syllable sounding: the bus's sound, and its own volume within the voices channel. */
interface Sounding {
  readonly sound: BusSound;
  readonly volume: number;
}

/**
 * Plays the babble of a line on the voices channel of the game's audio bus (`systems/babble.ts`
 * decides which syllable sounds when, how high and in which voice; this only keeps the time). The
 * syllables are scheduled on the scene's clock as the line starts typing, so they keep step with
 * the text. A voice says one syllable at a time: a new one cuts the one before with a short fade,
 * and so does silence, when the line is completed with a touch or the box moves on. A syllable
 * whose sound is not loaded, or asked for before audio is unlocked, plays nothing.
 */
export class BabblePlayer {
  private readonly waiting = new Set<Phaser.Time.TimerEvent>();
  /** The syllable each voice is saying, by layer, with its own volume. */
  private readonly sounding = new Map<number, Sounding>();
  private readonly bus: AudioBus | null;

  constructor(private readonly scene: Phaser.Scene) {
    // A scene without the shared context (none in the game) simply stays silent.
    this.bus = (contextOf(scene) as GameContext | undefined)?.audio ?? null;
    // Leaving the scene cuts the babble at once: its tweens would not run to fade it.
    scene.events.once('shutdown', () => this.stop(false));
  }

  /** Starts the babble of a line that starts typing now, silencing any babble still going. */
  play(syllables: readonly Syllable[]): void {
    this.stop();
    for (const syllable of syllables) {
      if (syllable.at <= 0) {
        this.say(syllable);
        continue;
      }
      const timer = this.scene.time.delayedCall(syllable.at, () => {
        this.waiting.delete(timer);
        this.say(syllable);
      });
      this.waiting.add(timer);
    }
  }

  /**
   * Silences the babble: the syllables still waiting are dropped and those sounding fade out, or
   * stop at once when `fade` is false.
   */
  stop(fade = true): void {
    for (const timer of this.waiting) timer.remove();
    this.waiting.clear();
    for (const sounding of this.sounding.values()) {
      if (fade) this.fadeOut(sounding);
      else this.bus?.stopSound(sounding.sound);
    }
    this.sounding.clear();
  }

  private say(syllable: Syllable): void {
    const { bus } = this;
    if (bus === null) return;
    const before = this.sounding.get(syllable.layer);
    if (before !== undefined) this.fadeOut(before);
    const sound = bus.play('voice', syllable.key, {
      volume: syllable.volume,
      rate: syllable.rate,
    });
    if (sound === null) this.sounding.delete(syllable.layer);
    else this.sounding.set(syllable.layer, { sound, volume: syllable.volume });
  }

  /**
   * Brings a syllable down to silence over a few ms, then stops it. One that has already ended
   * was released by the bus, which then leaves it alone.
   */
  private fadeOut({ sound, volume }: Sounding): void {
    const { bus } = this;
    if (bus === null) return;
    this.scene.tweens.addCounter({
      from: 1,
      to: 0,
      duration: FADE,
      onUpdate: (tween) => bus.setVolume(sound, (tween.getValue() ?? 0) * volume),
      onComplete: () => bus.stopSound(sound),
    });
  }
}
