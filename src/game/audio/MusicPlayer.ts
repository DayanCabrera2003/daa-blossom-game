import Phaser from 'phaser';
import {
  duckLevel,
  startDuck,
  trackFaded,
  trackLevel,
  type DuckSpan,
  type TrackSpan,
} from '@services/musicFade';
import type { AssetKey } from '../assets/keys';
import type { AudioBus, BusSound } from './AudioBus';

/** A track this player started, and when it rose and (once replaced) began to fall. */
interface Track {
  readonly sound: BusSound;
  span: TrackSpan;
}

/**
 * The music of the game, on the music channel of the audio bus. It lives as long as the game, so a
 * track keeps playing from one scene to the next: the scenes say which track their screen wants
 * (`systems/musicFor.ts` decides) and which jingle a moment rings, and this only plays them. A new
 * track loops, crossfading over 800 ms with the one before; asking again for the track already
 * playing changes nothing. Under a jingle the music ducks, and comes back once the jingle ends
 * (`services/musicFade.ts` gives the levels; they are applied every frame).
 *
 * A track asked for before the browser lets audio start begins on the first touch; a jingle asked
 * for then is dropped, as the bus drops any one-off sound. A key with no loaded sound plays nothing.
 */
export class MusicPlayer {
  private tracks: Track[] = [];
  /** The track the screen wants, playing or about to: null for silence. */
  private current: AssetKey | null = null;
  private duck: DuckSpan | null = null;
  /** How many jingles are sounding now: the music comes back when the last one ends. */
  private jingles = 0;

  constructor(
    private readonly game: Phaser.Game,
    private readonly bus: AudioBus,
  ) {
    game.events.on(Phaser.Core.Events.STEP, () => this.update());
    game.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      if (this.current !== null) this.start(this.current);
    });
  }

  /** Plays `key` in a loop, crossfading from whatever played; the same track again goes on as is. */
  play(key: AssetKey | null): void {
    if (key === this.current) return;
    const now = this.now();
    for (const track of this.tracks) {
      if (track.span.end === null) track.span = { ...track.span, end: now };
    }
    this.current = key;
    if (key !== null && !this.game.sound.locked) this.start(key);
  }

  /** Rings the jingle `key` once over the music, which ducks under it. */
  jingle(key: AssetKey): void {
    const sound = this.bus.play('music', key);
    if (sound === null) return;
    this.duck = startDuck(this.duck, this.now());
    this.jingles += 1;
    // Released by the bus when it completes (or stopped with the channel): either way, destroyed.
    sound.once(Phaser.Sound.Events.DESTROY, () => {
      this.jingles -= 1;
      if (this.jingles === 0 && this.duck !== null) this.duck = { ...this.duck, end: this.now() };
    });
  }

  private start(key: AssetKey): void {
    const sound = this.bus.play('music', key, { loop: true, volume: 0 });
    if (sound !== null) this.tracks.push({ sound, span: { start: this.now(), end: null } });
  }

  /** Every frame: each track at its crossfade level times the duck; faded tracks are stopped. */
  private update(): void {
    const now = this.now();
    const duck = duckLevel(this.duck, now);
    for (const track of this.tracks) {
      if (trackFaded(track.span, now)) this.bus.stopSound(track.sound);
      else this.bus.setVolume(track.sound, trackLevel(track.span, now) * duck);
    }
    this.tracks = this.tracks.filter((track) => !trackFaded(track.span, now));
  }

  private now(): number {
    return this.game.loop.time;
  }
}
