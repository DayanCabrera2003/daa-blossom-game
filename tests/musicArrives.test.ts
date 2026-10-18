import { describe, expect, it, vi } from 'vitest';
import { AudioBus } from '../src/game/audio/AudioBus';
import { MusicPlayer } from '../src/game/audio/MusicPlayer';
import { defaultSettings } from '../src/services/settings';

// A track that arrives after its screen asked for it (plan 09, phase 9): the hub's music is no
// longer in the first load, so the hub starts in silence and its music loads behind it. The music
// player starts the track the screen still wants as soon as its sound lands in the audio cache,
// rising with its fade like any new track; a track nobody wants any more stays silent.

// The few names of the engine the bus and the player use: the rest of Phaser needs a browser.
vi.mock('phaser', () => ({
  default: {
    Cache: { Events: { ADD: 'add' } },
    Core: { Events: { HIDDEN: 'hidden', VISIBLE: 'visible', STEP: 'step' } },
    Sound: { Events: { UNLOCKED: 'unlocked', COMPLETE: 'complete', DESTROY: 'destroy' } },
  },
}));

type Listener = (...args: unknown[]) => void;

/** Listeners by event, as Phaser's emitters keep them. */
function emitter() {
  const listeners = new Map<string, Listener[]>();
  const on = (event: string, listener: Listener) => {
    listeners.set(event, [...(listeners.get(event) ?? []), listener]);
  };
  return {
    on,
    once: on,
    emit: (event: string, ...args: unknown[]) =>
      (listeners.get(event) ?? []).forEach((listener) => listener(...args)),
  };
}

/** A sound the fake engine makes, which remembers its key and the volume it was given. */
function fakeSound(key: string) {
  return {
    ...emitter(),
    key,
    volume: -1,
    setVolume(volume: number) {
      this.volume = volume;
    },
    play() {},
    stop() {},
    destroy() {},
  };
}

/** A game whose audio cache starts empty and takes sounds as the loader adds them. */
function fakeGame(locked = false) {
  const loaded = new Set<string>();
  const made: ReturnType<typeof fakeSound>[] = [];
  const cacheEvents = emitter();
  const game = {
    events: emitter(),
    sound: {
      ...emitter(),
      locked,
      add: (key: string) => {
        const one = fakeSound(key);
        made.push(one);
        return one;
      },
    },
    cache: { audio: { exists: (key: string) => loaded.has(key), events: cacheEvents } },
    loop: { time: 0 },
  };
  /** The loader adds `key` to the audio cache, as Phaser's does once a file is decoded. */
  const arrive = (key: string): void => {
    loaded.add(key);
    cacheEvents.emit('add', game.cache.audio, key, {});
  };
  return { game, made, arrive };
}

const playerOver = (game: ReturnType<typeof fakeGame>['game']): MusicPlayer =>
  new MusicPlayer(game as never, new AudioBus(game as never, defaultSettings()));

describe('a track that arrives after it was asked for', () => {
  it('starts once its sound is loaded, rising from silence', () => {
    const { game, made, arrive } = fakeGame();
    const music = playerOver(game);
    music.play('music.hub');
    expect(made).toEqual([]);
    arrive('music.hub');
    expect(made.map((sound) => sound.key)).toEqual(['music.hub']);
    expect(made[0]?.volume).toBe(0);
    game.loop.time += 10_000;
    game.events.emit('step');
    expect(made[0]?.volume).toBeGreaterThan(0);
  });

  it('stays silent when the screen wants another track by then', () => {
    const { game, made, arrive } = fakeGame();
    const music = playerOver(game);
    music.play('music.hub');
    music.play('music.ch1');
    arrive('music.hub');
    expect(made).toEqual([]);
  });

  it('starts nothing for another sound that arrives', () => {
    const { game, made, arrive } = fakeGame();
    const music = playerOver(game);
    music.play('music.hub');
    arrive('sfx.stone');
    expect(made).toEqual([]);
  });

  it('never starts the track twice when it is already playing', () => {
    const { game, made, arrive } = fakeGame();
    arrive('music.hub');
    const music = playerOver(game);
    music.play('music.hub');
    arrive('music.hub');
    expect(made.map((sound) => sound.key)).toEqual(['music.hub']);
  });

  it('waits for the first touch when audio is still locked', () => {
    const { game, made, arrive } = fakeGame(true);
    const music = playerOver(game);
    music.play('music.hub');
    arrive('music.hub');
    expect(made).toEqual([]);
    game.sound.locked = false;
    game.sound.emit('unlocked');
    expect(made.map((sound) => sound.key)).toEqual(['music.hub']);
  });
});
