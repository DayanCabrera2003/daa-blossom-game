import type { BlossomError } from '@core/blossom/isBlossom';
import type { PathError } from '@core/matching/paths';
import type { ActionType } from '@core/rules/actions';
import { NAMED_CHAPTERS } from '@game/picture/chapterTitle';
import type { RefusalCode } from '@game/systems/refusal';
import { CARD_IDS } from '@levels/cards/schema';

/**
 * Every interface text key the game uses, with the `{parameters}` it fills in (sprout names,
 * counts). `tests/content.test.ts` checks each locale against this list: nothing missing, nothing
 * left over, the same parameters. Codes from the core are listed with `satisfies Record<…>`, so
 * TypeScript fails here if a refusal code, a path or flower sub-error, or an action is added or
 * removed without its text.
 */

type Params = readonly string[];

/** Why an action was refused (`core/rules/reasons.ts`, and the game's own in `game/systems/refusal.ts`). */
const REASONS = {
  actionLocked: ['action'],
  vertexOutOfRange: [],
  notAdjacent: ['u', 'v'],
  alreadyLit: ['vertex'],
  notLit: ['u', 'v'],
  notInTheDark: ['vertex'],
  notARoot: ['vertex'],
  noLanternToPass: ['vertex'],
  flowersFolded: [],
  invalidPath: [],
  noFog: [],
  alreadyInspected: ['vertex'],
  vineHidden: ['vertex'],
  notASun: ['vertex'],
  litVine: ['u', 'v'],
  insideOneFlower: [],
  alreadyMarked: ['vertex'],
  sunMeetsSun: ['u', 'v'],
  notSunsOfOneTree: ['u', 'v'],
  searchInProgress: [],
  notAFlower: [],
  noSuchFlower: [],
  alreadyPlaced: ['vertex'],
  notPlaced: ['vertex'],
  notNow: [],
  twoSilver: ['vertex'],
} as const satisfies Record<RefusalCode, Params>;

/** Where a dragged chain goes wrong (`core/matching/paths.ts`), named by the sprouts involved. */
const PATH_ERRORS = {
  empty: [],
  vertexOutOfRange: [],
  repeatedVertex: ['vertex'],
  notAdjacent: ['u', 'v'],
  notAlternating: ['u', 'v'],
  tooShort: [],
  endpointNotExposed: ['vertex'],
  wrongParity: [],
} as const satisfies Record<PathError['code'], Params>;

/** Why a chosen loop is not a flower (`core/blossom/isBlossom.ts`). */
const BLOSSOM_ERRORS = {
  tooShort: [],
  evenLength: ['length'],
  vertexOutOfRange: [],
  repeatedVertex: ['vertex'],
  notAdjacent: ['u', 'v'],
  notAlternating: ['vertex'],
} as const satisfies Record<BlossomError['code'], Params>;

/** The name of each action, used when one is still locked. */
const ACTIONS = {
  join: [],
  split: [],
  passLantern: [],
  chain: [],
  declareDone: [],
  inspect: [],
  markRoot: [],
  markMoon: [],
  placeScarecrow: [],
  removeScarecrow: [],
  fold: [],
  foldAt: [],
  unfold: [],
  rotateStem: [],
  liftStone: [],
  dropStone: [],
} as const satisfies Record<ActionType, Params>;

/** Interface texts that are not about a code from the core. */
const UI = {
  'hud.goal': ['count'],
  'hud.goalHidden': [],
  'hud.bet': ['count'],
  'hud.mirror': ['yours', 'mirror'],
  'hud.prompt.sun': [],
  'hud.prompt.explore': [],
  'hud.prompt.separate': [],
  'hud.prompt.draw': [],
  'hud.lanterns': ['count'],
  'hud.water': ['used', 'budget'],
  'hud.waterNoBudget': ['used'],
  'hud.done': [],
  'hud.undo': [],
  'hud.redo': [],
  'hud.hint': [],
  'hud.back': [],
  'hud.help': [],
  'tool.lanterns': [],
  'tool.marks': [],
  'tool.foldLoop': [],
  'tool.inspect': [],
  'tool.scarecrows': [],
  'tool.stones': [],
  'chain.gainOne': [],
  'chain.gainZero': [],
  'hint.generic.1': [],
  'hint.generic.2': [],
  'hint.generic.3': [],
  'dialogue.continue': [],
  'question.choose': [],
  'bet.choose': [],
  'bet.veil': [],
  'bet.revealRight': ['count'],
  'bet.revealWrong': ['bet', 'count'],
  'notebook.title': [],
  'notebook.choose': [],
  'notebook.written': [],
  'counterexample.back': [],
  'pond.strands': ['count'],
  'mirror.notBetter': ['drawn', 'yours'],
  'mirror.chain': [],
  'mirror.again': [],
  'mirror.spared': [],
  'hud.checkMirror': [],
  'victory.title': [],
  'victory.stars': ['count'],
  'victory.next': [],
  'victory.hub': [],
  'hub.title': [],
  'hub.chapter': ['number'],
  'hub.locked': [],
  'hub.exportLog': [],
  'tutorial.ok': [],
} as const satisfies Record<string, Params>;

const prefixed = (prefix: string, table: Readonly<Record<string, Params>>) =>
  Object.fromEntries(Object.entries(table).map(([key, params]) => [`${prefix}${key}`, params]));

/** Every text key with its parameters. */
export const TEXT_PARAMS: Readonly<Record<string, Params>> = {
  ...prefixed('reason.', REASONS),
  ...prefixed('reason.invalidPath.', PATH_ERRORS),
  ...prefixed('reason.notAFlower.', BLOSSOM_ERRORS),
  ...prefixed('action.', ACTIONS),
  ...UI,
  // The title and the gesture of each mechanic card (GDD §5.11).
  ...Object.fromEntries(
    CARD_IDS.flatMap((id) => [
      [`tutorial.${id}.title`, []],
      [`tutorial.${id}.body`, []],
    ]),
  ),
  // The name of each named chapter, over its levels in the hub.
  ...Object.fromEntries(NAMED_CHAPTERS.map((chapter) => [`hub.chapterName.${chapter}`, []])),
};
