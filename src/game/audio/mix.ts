import type { MusicFade } from '@services/musicFade';
import { defaultSettings } from '@services/settings';
import type { AssetKey } from '../assets/keys';
import type { Voice } from '../systems/babble';
import type { Speaker } from '../systems/speaker';
import type { Pace } from '../systems/typewriter';

/**
 * The mix of the game as data (plan 09, phase 8): every number that is tuned by ear lives in this
 * one table, so the author changes a number here and never a function. Pure: no engine. The audio
 * bus, the music player, the replay of the sun, the babble and the typewriter read it; each number
 * stays in the range `MIX_RANGES` gives it (`mix.test.ts` checks them).
 */

/** The ranges a value of the mix may take: closed, low to high. */
type Range = readonly [low: number, high: number];

/** The whole mix. */
export interface Mix {
  /**
   * The volume of each channel for a new player (the settings' sliders then move it): these are
   * the defaults of `services/settings.ts`, which the settings panel of the overlays shares, so
   * they are changed there and shown here.
   */
  readonly channels: { readonly music: number; readonly sfx: number; readonly voice: number };
  /** The own gain of each effect and each jingle within its channel, between 0 and 1. */
  readonly sounds: Readonly<Partial<Record<AssetKey, number>>>;
  readonly music: MusicFade;
  /** How loud a replayed day of the sun sounds, against the move itself: an echo, not the day. */
  readonly replay: number;
  /** How each speaker babbles (plan 06, section 1.9): syllables, pitches, delays and volumes. */
  readonly voices: Readonly<Record<Speaker, Voice | null>>;
  /** How fast each speaker's line is typed, and the pauses after a comma and after a stop. */
  readonly paces: Readonly<Record<Speaker, Pace>>;
}

const { music, sfx, voice } = defaultSettings();

export const MIX: Mix = {
  channels: { music, sfx, voice },
  // Every effect and jingle at its own full volume until the author's listening says otherwise.
  sounds: {
    'jingle.victory': 1,
    'jingle.unlock': 1,
    'jingle.betWon': 1,
    'sfx.putOut': 1,
    'sfx.markSun': 1,
    'sfx.markMoon': 1,
    'sfx.conflict': 1,
    'sfx.inspect': 1,
    'sfx.waterDrop': 1,
    'sfx.chainFound': 1,
    'sfx.searchCleared': 1,
    'sfx.stone': 1,
    'sfx.scarecrow': 1,
    'sfx.reject': 1,
    'sfx.button': 1,
    'sfx.advance': 1,
    'sfx.panelOpen': 1,
    'sfx.panelClose': 1,
    'sfx.bookOpen': 1,
    'sfx.bookFlip1': 1,
    'sfx.bookFlip2': 1,
    'sfx.bookFlip3': 1,
    'sfx.bookClose': 1,
    'sfx.card': 1,
    'sfx.brutoSleeps': 1,
    // The bells of the lanterns, one per note of the scale.
    'sfx.chime1': 1,
    'sfx.chime2': 1,
    'sfx.chime3': 1,
    'sfx.chime4': 1,
    'sfx.chime5': 1,
    'sfx.chime6': 1,
    'sfx.chime7': 1,
    'sfx.chime8': 1,
    'sfx.chime9': 1,
    'sfx.chime10': 1,
    'sfx.chime11': 1,
    'sfx.chime12': 1,
    'sfx.chime13': 1,
    'sfx.chime14': 1,
    'sfx.chime15': 1,
    'sfx.sparkle': 1,
    // The chord of a flower folding and unfolding.
    'sfx.fold': 1,
    'sfx.unfold': 1,
  },
  music: { crossfadeMs: 800, duckLevel: 0.3, duckMs: 150, unduckMs: 600 },
  replay: 0.5,
  // The pack's syllables are high, so every male voice plays them slower: the mentor warm and
  // mid-low, the gnome high and rushed, the oaks a chorus of three very low voices, each a little
  // later than the one below. Each oak keeps a narrow band around its own pitch (0.42, 0.47 and
  // 0.53), so the line id can still vary it slightly. The gardener and the notebook do not babble.
  voices: {
    sauce: {
      keys: ['voice.6', 'voice.10', 'voice.3'],
      every: 3,
      layers: [{ rate: [0.6, 0.68], delay: 0, volume: 1 }],
    },
    bruto: {
      keys: ['voice.1', 'voice.2', 'voice.4'],
      every: 3,
      layers: [{ rate: [1.15, 1.35], delay: 0, volume: 1 }],
    },
    oaks: {
      keys: ['voice.7', 'voice.6'],
      every: 4,
      // Three voices at once would be loud: each sounds softer than a single speaker.
      layers: [
        { rate: [0.41, 0.43], delay: 0, volume: 0.6 },
        { rate: [0.46, 0.48], delay: 35, volume: 0.6 },
        { rate: [0.52, 0.54], delay: 70, volume: 0.6 },
      ],
    },
    gardener: null,
    notebook: null,
  },
  // The mentor calm, the gnome hurried, the oaks slow and solemn (GDD §3.2); the gardener's answers
  // and the notebook do not babble, but are typed at a plain pace between the mentor's and gnome's.
  paces: {
    sauce: { lettersPerSecond: 24, commaPause: 120, stopPause: 300 },
    bruto: { lettersPerSecond: 40, commaPause: 60, stopPause: 120 },
    oaks: { lettersPerSecond: 16, commaPause: 250, stopPause: 500 },
    gardener: { lettersPerSecond: 30, commaPause: 100, stopPause: 200 },
    notebook: { lettersPerSecond: 30, commaPause: 100, stopPause: 200 },
  },
};

/**
 * The ranges the numbers of the mix keep to: gains between silence and full (never above the
 * channel), fades short enough to follow the moment, the pitches of plan 06, section 1.9 (Sauce
 * 0.60–0.68, Bruto 1.15–1.35, each oak within 0.02 of 0.42, 0.47 and 0.53), and paces of typing
 * a player can read along with.
 */
export const MIX_RANGES: {
  readonly gain: Range;
  readonly fadeMs: Range;
  readonly lettersPerSecond: Range;
  readonly pauseMs: Range;
  readonly babbleRate: Readonly<Record<Speaker, readonly Range[] | null>>;
} = {
  gain: [0, 1],
  fadeMs: [0, 2000],
  lettersPerSecond: [8, 60],
  pauseMs: [0, 1000],
  babbleRate: {
    sauce: [[0.6, 0.68]],
    bruto: [[1.15, 1.35]],
    oaks: [
      [0.4, 0.44],
      [0.45, 0.49],
      [0.51, 0.55],
    ],
    gardener: null,
    notebook: null,
  },
};

/** The own gain of the sound `key` within its channel: its row of the table, or full. */
export const soundGainOf = (key: string): number =>
  (MIX.sounds as Readonly<Record<string, number | undefined>>)[key] ?? 1;
