import { describe, expect, it } from 'vitest';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { assetEntry } from '../assets/keys';
import type { Effect } from './levelController';
import {
  JINGLES,
  cardJingle,
  effectJingle,
  levelScreen,
  trackFor,
  victoryJingle,
  type MusicScreen,
} from './musicFor';

const LEVELS = catalog();

const levelById = (id: string): Level => {
  const level = LEVELS.find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

const HUB: MusicScreen = { kind: 'hub' };

describe('the track of each screen', () => {
  it('the hub plays its own track, a music of the manifest', () => {
    expect(trackFor(HUB)).toBe('music.hub');
    expect(assetEntry('music.hub').kind).toBe('music');
  });

  it('every level of the catalog plays a music track of the manifest', () => {
    for (const level of LEVELS) {
      const track = trackFor(levelScreen(level));
      expect(track, level.data.id).not.toBeNull();
      if (track !== null) expect(assetEntry(track).kind).toBe('music');
    }
  });

  it('every chapter has its own track, none of them the hub', () => {
    const chapters = new Map<string, string | null>();
    for (const level of LEVELS) {
      const screen = levelScreen(level);
      if (screen.kind === 'level' && !screen.races)
        chapters.set(level.data.id.split('.')[0] ?? '', trackFor(screen));
    }
    const tracks = [...chapters.values()];
    expect(new Set(tracks).size).toBe(tracks.length);
    expect(tracks).not.toContain('music.hub');
    expect(chapters.get('2')).toBe('music.ch2');
  });

  it('the races of chapter 6 play their faster variant', () => {
    expect(levelScreen(levelById('6.4'))).toEqual({ kind: 'level', levelId: '6.4', races: true });
    expect(trackFor(levelScreen(levelById('6.4')))).toBe('music.ch6Race');
    expect(trackFor(levelScreen(levelById('6.5')))).toBe('music.ch6Race');
    expect(trackFor(levelScreen(levelById('6.1')))).toBe('music.ch6');
  });

  it('a chapter with no race variant keeps its own track for a race', () => {
    expect(trackFor({ kind: 'level', levelId: '3.2', races: true })).toBe('music.ch3');
  });

  it('a level of a chapter with no music plays nothing', () => {
    expect(trackFor({ kind: 'level', levelId: '9.1', races: false })).toBeNull();
    expect(trackFor({ kind: 'level', levelId: 'odd', races: false })).toBeNull();
  });

  it('back to the hub from a level changes the track; another level of the chapter does not', () => {
    const first = trackFor(levelScreen(levelById('2.1')));
    expect(trackFor(levelScreen(levelById('2.2')))).toBe(first);
    expect(trackFor(HUB)).not.toBe(first);
  });
});

describe('the jingle of each moment', () => {
  it('each moment has a jingle of the manifest', () => {
    for (const key of Object.values(JINGLES)) expect(assetEntry(key).kind).toBe('jingle');
  });

  it('a victory gives the victory jingle', () => {
    expect(victoryJingle(new Set(['0.1']), new Set(['0.1', '0.2']))).toBe('jingle.victory');
  });

  it('a victory that opens a new chapter gives the unlock jingle', () => {
    expect(victoryJingle(new Set(['0.1', '0.2']), new Set(['0.1', '0.2', '1.1']))).toBe(
      'jingle.unlock',
    );
  });

  it('a victory that opens nothing new (a level won again) gives the victory jingle', () => {
    const open = new Set(['0.1', '0.2', '1.1']);
    expect(victoryJingle(open, open)).toBe('jingle.victory');
  });

  it('a tool card seen for the first time gives the unlock jingle', () => {
    expect(cardJingle('stones', new Set())).toBe('jingle.unlock');
    expect(cardJingle('layers', new Set())).toBe('jingle.unlock');
    expect(cardJingle('sun', new Set())).toBe('jingle.unlock');
  });

  it('the card the game opens with gives none: the first screen starts in silence', () => {
    expect(cardJingle('lanterns', new Set())).toBeNull();
  });

  it('a card seen before, or the card of a script step, gives none', () => {
    expect(cardJingle('stones', new Set(['stones']))).toBeNull();
    expect(cardJingle('bet', new Set())).toBeNull();
    expect(cardJingle('race', new Set())).toBeNull();
  });

  it('a bet won exactly gives the bet jingle; a bet off by one does not', () => {
    const won: Effect = { kind: 'reveal', bet: 3, right: 3 };
    const lost: Effect = { kind: 'reveal', bet: 2, right: 3 };
    expect(effectJingle(won)).toBe('jingle.betWon');
    expect(effectJingle(lost)).toBeNull();
  });

  it('a race that settles a right doubling bet gives the bet jingle', () => {
    const bet = (correct: boolean) => ({ step: 1, value: 0, correct });
    const raced = (bets: ReturnType<typeof bet>[]): Effect => ({ kind: 'raced', step: 2, bets });
    expect(effectJingle(raced([bet(false), bet(true)]))).toBe('jingle.betWon');
    expect(effectJingle(raced([bet(false)]))).toBeNull();
    expect(effectJingle(raced([]))).toBeNull();
  });

  it('other effects give no jingle', () => {
    expect(effectJingle({ kind: 'play' })).toBeNull();
  });
});
