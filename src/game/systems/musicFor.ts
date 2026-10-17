import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import type { CardId } from '@levels/cards/schema';
import { ASSET_KEYS, type AssetKey } from '../assets/keys';
import { chapterGroup } from '../assets/loadPlan';
import type { Effect } from './levelController';
import { ACTION_CARD } from './tutorials';

/**
 * What plays when (plan 06, section 1.7): the track of each screen and the jingle of each moment.
 * Pure: the scenes ask and hand the answer to the music player, which only plays it.
 */

/** A screen, as far as its music goes: the hub, or a level and whether it holds races. */
export type MusicScreen =
  | { readonly kind: 'hub' }
  | { readonly kind: 'level'; readonly levelId: string; readonly races: boolean };

/** The moments that ring a jingle over the music. */
export type JingleMoment = 'victory' | 'unlock' | 'betWon';

/** The jingle of each moment. */
export const JINGLES: Readonly<Record<JingleMoment, AssetKey>> = {
  victory: 'jingle.victory',
  unlock: 'jingle.unlock',
  betWon: 'jingle.betWon',
};

/** The music screen of a level: a level whose script runs races takes the race variant. */
export function levelScreen(level: Level): MusicScreen {
  const races = level.flow.some((step) => step.step === 'race');
  return { kind: 'level', levelId: level.data.id, races };
}

/** `key` as a key of the manifest, or null when the manifest has none such. */
const manifestKey = (key: string): AssetKey | null =>
  ASSET_KEYS.find((candidate) => candidate === key) ?? null;

/**
 * The track a screen plays: the hub's own, or its chapter's (`music.ch4` for any level 4.x); a
 * level with races plays its chapter's faster variant (`music.ch6Race`, GDD §6.4) where there is
 * one. Two levels of a chapter give the same track, so going from one to the other changes nothing.
 * Null for a level of a chapter with no music in the manifest: it plays in silence.
 */
export function trackFor(screen: MusicScreen): AssetKey | null {
  if (screen.kind === 'hub') return 'music.hub';
  const group = chapterGroup(screen.levelId);
  if (group === null) return null;
  const variant = screen.races ? manifestKey(`music.${group}Race`) : null;
  return variant ?? manifestKey(`music.${group}`);
}

/** The chapter of a level id (`4.10` is `4`). */
const chapterOf = (levelId: string): string => itemAt(levelId.split('.'), 0);

/**
 * The jingle of a victory, from the levels open before and after it: a win that opens a chapter
 * none of whose levels were open rings the unlock instead; any other win, its own jingle.
 */
export function victoryJingle(before: ReadonlySet<string>, after: ReadonlySet<string>): AssetKey {
  const chapters = new Set([...before].map(chapterOf));
  const opensChapter = [...after].some((id) => !chapters.has(chapterOf(id)));
  return JINGLES[opensChapter ? 'unlock' : 'victory'];
}

/** The cards that bring a tool: one per gesture of the rules, the sun and the layers. */
const TOOL_CARDS: ReadonlySet<CardId> = new Set<CardId>([
  ...Object.values(ACTION_CARD),
  'sun',
  'layers',
]);

/**
 * The jingle of a mechanic card as it shows: the unlock when it brings a tool the player had never
 * seen (`seen`, the cards closed before); none for one seen before, shown again on "?", nor for
 * the card of a script step (a bet, a question), which opens no tool.
 */
export function cardJingle(card: CardId, seen: ReadonlySet<string>): AssetKey | null {
  return TOOL_CARDS.has(card) && !seen.has(card) ? JINGLES.unlock : null;
}

/**
 * The jingle an effect of the level controller rings: a bet won, told as the play step is won
 * with the bet exactly right (1.x), or a race that settles at least one right doubling bet (6.5).
 */
export function effectJingle(effect: Effect): AssetKey | null {
  switch (effect.kind) {
    case 'reveal':
      return effect.bet === effect.right ? JINGLES.betWon : null;
    case 'raced':
      return effect.bets.some((bet) => bet.correct) ? JINGLES.betWon : null;
    default:
      return null;
  }
}
