import Phaser from 'phaser';
import { channelGain, soundGain } from '@services/audioGain';
import type { AudioChannel, Settings } from '@services/settings';

/** A sound as the game's sound manager makes it, whichever manager the browser got. */
export type BusSound = ReturnType<Phaser.Game['sound']['add']>;

/** How a sound is asked for: its own volume within its channel, its rate, and whether it loops. */
export interface PlayOptions {
  /** Between 0 and 1, relative to the channel (1 by default). */
  readonly volume?: number;
  /** A looping sound (a music track) waits for the first touch instead of being dropped. */
  readonly loop?: boolean;
  /** Playback rate (1 by default): a babble syllable played slower sounds lower. */
  readonly rate?: number;
}

/** A sound playing on a channel, with the volume it was asked for (a fading track changes it). */
interface Playing {
  readonly sound: BusSound;
  readonly channel: AudioChannel;
  volume: number;
}

/** A looping sound asked for before the browser let audio start. */
interface Waiting {
  readonly channel: AudioChannel;
  readonly key: string;
  readonly options: PlayOptions;
}

/**
 * The game's audio bus: three channels (music, effects, voices), each at the gain the settings
 * give it (`services/audioGain.ts` decides; this only applies it). It lives as long as the game,
 * shared by every scene through the context.
 *
 * Browsers keep audio locked until the first touch; Phaser unlocks it then. Until that happens a
 * one-off sound is dropped (it would otherwise burst out late, all at once) and a looping one waits
 * and starts on the unlock. While the tab is hidden every channel is silent. A key with no loaded
 * sound is simply not played, so the bus works before any sound exists.
 */
export class AudioBus {
  private readonly playing = new Set<Playing>();
  private waiting: Waiting | null = null;
  private hidden: boolean;

  constructor(
    private readonly game: Phaser.Game,
    private settings: Settings,
  ) {
    this.hidden = typeof document !== 'undefined' && document.hidden;
    game.events.on(Phaser.Core.Events.HIDDEN, () => this.setHidden(true));
    game.events.on(Phaser.Core.Events.VISIBLE, () => this.setHidden(false));
    game.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.startWaiting());
  }

  /** Takes new settings (a slider moved, mute switched) and applies them to what is playing. */
  apply(settings: Settings): void {
    this.settings = settings;
    this.regain();
  }

  /**
   * Plays the sound loaded under `key` on `channel`; null when nothing plays (no such sound, or
   * audio still locked).
   */
  play(channel: AudioChannel, key: string, options: PlayOptions = {}): BusSound | null {
    if (!this.game.cache.audio.exists(key)) return null;
    if (this.game.sound.locked) {
      if (options.loop === true) this.waiting = { channel, key, options };
      return null;
    }
    const volume = options.volume ?? 1;
    const sound = this.game.sound.add(key, {
      loop: options.loop ?? false,
      rate: options.rate ?? 1,
    });
    const playing: Playing = { sound, channel, volume };
    this.playing.add(playing);
    sound.once(Phaser.Sound.Events.COMPLETE, () => this.release(playing));
    sound.once(Phaser.Sound.Events.DESTROY, () => this.playing.delete(playing));
    sound.setVolume(this.gainOf(playing));
    sound.play();
    return sound;
  }

  /** Stops every sound of `channel` (a music track giving way to another), and any one waiting. */
  stop(channel: AudioChannel): void {
    if (this.waiting?.channel === channel) this.waiting = null;
    for (const playing of [...this.playing]) {
      if (playing.channel === channel) this.release(playing);
    }
  }

  /**
   * Sets the own volume of a sound this bus plays, between 0 and 1 of its channel (a track fading
   * in or out, the music ducking under a jingle); a sound already stopped is left alone.
   */
  setVolume(sound: BusSound, volume: number): void {
    const playing = this.find(sound);
    if (playing === undefined) return;
    playing.volume = volume;
    sound.setVolume(this.gainOf(playing));
  }

  /** Stops one sound this bus plays (a track that has faded out), leaving the rest of its channel. */
  stopSound(sound: BusSound): void {
    const playing = this.find(sound);
    if (playing !== undefined) this.release(playing);
  }

  private find(sound: BusSound): Playing | undefined {
    return [...this.playing].find((playing) => playing.sound === sound);
  }

  private gainOf(playing: Playing): number {
    return soundGain(channelGain(this.settings, playing.channel, this.hidden), playing.volume);
  }

  private regain(): void {
    for (const playing of this.playing) playing.sound.setVolume(this.gainOf(playing));
  }

  private setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.regain();
  }

  private startWaiting(): void {
    const waiting = this.waiting;
    this.waiting = null;
    if (waiting !== null) this.play(waiting.channel, waiting.key, waiting.options);
  }

  private release(playing: Playing): void {
    this.playing.delete(playing);
    playing.sound.destroy();
  }
}
