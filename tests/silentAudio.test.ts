import { describe, expect, it, vi } from 'vitest';
import { AudioBus } from '../src/game/audio/AudioBus';
import { BabblePlayer } from '../src/game/audio/BabblePlayer';
import { MusicPlayer } from '../src/game/audio/MusicPlayer';
import { SfxPlayer } from '../src/game/audio/SfxPlayer';
import { keysOfKind, type AssetKey } from '../src/game/assets/keys';
import { babble } from '../src/game/systems/babble';
import { defaultSettings } from '../src/services/settings';

// The game without a single sound loaded (plan 09, phase 8): a browser that plays none of the
// files offered, a network that brought none, a key whose file is not loaded yet. The bus and the
// three players then play nothing and never fail, so the hub and every level are played in
// silence. And a sound that is loaded plays at its channel's gain times its own and the mix's.

// The few names of the engine the bus and the players use: the rest of Phaser needs a browser.
vi.mock('phaser', () => ({
  default: {
    Cache: { Events: { ADD: 'add' } },
    Core: { Events: { HIDDEN: 'hidden', VISIBLE: 'visible', STEP: 'step' } },
    Sound: { Events: { UNLOCKED: 'unlocked', COMPLETE: 'complete', DESTROY: 'destroy' } },
  },
}));

// The mix with one effect turned down, to see its own gain applied.
vi.mock('../src/game/audio/mix', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/game/audio/mix')>();
  return {
    ...actual,
    soundGainOf: (key: string) => (key === 'sfx.stone' ? 0.25 : actual.soundGainOf(key)),
  };
});

/** Listeners by event, as Phaser's emitters keep them. */
function emitter() {
  const listeners = new Map<string, (() => void)[]>();
  const on = (event: string, listener: () => void) => {
    listeners.set(event, [...(listeners.get(event) ?? []), listener]);
  };
  return {
    on,
    once: on,
    emit: (event: string) => (listeners.get(event) ?? []).forEach((listener) => listener()),
  };
}

/** A sound the fake engine makes, which remembers the volume it was given. */
function fakeSound() {
  const events = emitter();
  return {
    ...events,
    volume: -1,
    setVolume(volume: number) {
      this.volume = volume;
    },
    play() {},
    destroy() {},
  };
}

/** A game with `loaded` sounds in its cache (none by default), audio unlocked. */
function fakeGame(loaded: readonly string[] = []) {
  const events = emitter();
  const made: ReturnType<typeof fakeSound>[] = [];
  const sound = {
    ...emitter(),
    locked: false,
    add: () => {
      const one = fakeSound();
      made.push(one);
      return one;
    },
  };
  const game = {
    events,
    sound,
    cache: { audio: { exists: (key: string) => loaded.includes(key), events: emitter() } },
    loop: { time: 0 },
  };
  return { game, made };
}

/** A scene whose clock runs every waiting call at once, sharing `bus` as the game's audio. */
function fakeScene(bus: AudioBus) {
  const waiting: (() => void)[] = [];
  const scene = {
    events: emitter(),
    registry: { get: () => ({ audio: bus }) },
    time: {
      delayedCall: (_ms: number, callback: () => void) => {
        waiting.push(callback);
        return { remove: () => undefined };
      },
    },
    tweens: { addCounter: () => undefined },
  };
  return { scene, runAll: () => waiting.splice(0).forEach((callback) => callback()) };
}

const SOUNDS: AssetKey[] = (['music', 'sfx', 'voice', 'jingle'] as const).flatMap(keysOfKind);

/** A bus over the fake game; the engine's types are not the fakes', so they meet here once. */
const busOver = (game: ReturnType<typeof fakeGame>['game']): AudioBus =>
  new AudioBus(game as never, defaultSettings());

describe('the game with no sound loaded', () => {
  it('the bus plays nothing for any sound, on any channel, and makes no sound', () => {
    const { game, made } = fakeGame();
    const bus = busOver(game);
    for (const key of SOUNDS) {
      for (const channel of ['music', 'sfx', 'voice'] as const) {
        expect(bus.play(channel, key, { loop: channel === 'music' })).toBeNull();
      }
    }
    expect(made).toEqual([]);
  });

  it('the music player takes every track and every jingle, frame after frame, in silence', () => {
    const { game, made } = fakeGame();
    const music = new MusicPlayer(game as never, busOver(game));
    for (const key of keysOfKind('music')) {
      music.play(key);
      expect(music.track).toBe(key);
      game.loop.time += 1000;
      game.events.emit('step');
    }
    for (const key of keysOfKind('jingle')) music.jingle(key);
    game.events.emit('step');
    music.play(null);
    expect(music.track).toBeNull();
    expect(made).toEqual([]);
  });

  it('the effects player plays every cue, now and later, in silence', () => {
    const { game, made } = fakeGame();
    const { scene, runAll } = fakeScene(busOver(game));
    const sfx = new SfxPlayer(scene as never, busOver(game));
    sfx.schedule(keysOfKind('sfx').map((key, at) => ({ key, at })));
    runAll();
    sfx.cancel();
    expect(made).toEqual([]);
  });

  it('the babble of every speaker plays in silence', () => {
    const { game, made } = fakeGame();
    const { scene, runAll } = fakeScene(busOver(game));
    const player = new BabblePlayer(scene as never);
    for (const speaker of ['sauce', 'bruto', 'oaks'] as const) {
      player.play(babble({ id: `ch1.1.${speaker}.01`, text: 'Buenos días, jardinero.', speaker }));
      runAll();
    }
    player.stop();
    expect(made).toEqual([]);
  });
});

describe('a loaded sound', () => {
  it("plays at its channel's gain times its own volume and its gain in the mix", () => {
    const { game, made } = fakeGame(['sfx.stone', 'sfx.putOut']);
    const bus = busOver(game);
    bus.play('sfx', 'sfx.stone', { volume: 0.5 });
    bus.play('sfx', 'sfx.putOut', { volume: 0.5 });
    const { sfx } = defaultSettings();
    expect(made.map((sound) => sound.volume)).toEqual([sfx * 0.5 * 0.25, sfx * 0.5]);
  });

  it('keeps its gain in the mix as a fade changes its own volume', () => {
    const { game, made } = fakeGame(['sfx.stone']);
    const bus = busOver(game);
    const sound = bus.play('sfx', 'sfx.stone');
    expect(sound).not.toBeNull();
    if (sound !== null) bus.setVolume(sound, 0.4);
    expect(made[0]?.volume).toBeCloseTo(defaultSettings().sfx * 0.4 * 0.25);
  });
});
