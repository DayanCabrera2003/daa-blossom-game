import type { BlossomError } from '@core/blossom/isBlossom';
import type { PathError } from '@core/matching/paths';
import type { ActionType } from '@core/rules/actions';
import { NAMED_CHAPTERS } from '@game/picture/chapterTitle';
import type { RefusalCode } from '@game/systems/refusal';
import { CARD_IDS } from '@levels/cards/schema';
import { CODEX_TABS } from '@levels/codex';
import { RECIPE_CARDS, RECIPE_CASES } from '@core/recipe/recipe';
import { cardTextKey, failureTextKey, RECALL_KEY } from '@levels/recipeCards';
import { RUNNERS } from '@core/cost/benchmark';
import { DOUBLING_ANSWERS } from '@core/cost/doubling';
import { doublingTextKey } from '@levels/races';
import { AUDIO_CHANNELS } from '@services/settings';
import { SPEAKERS } from '@game/systems/speaker';

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
  'hud.leaveLayer': [],
  'hud.layer': ['depth'],
  'hud.council': ['groups', 'stones', 'atLeast', 'dark'],
  'hud.councilHidden': [],
  'tool.lanterns': [],
  'tool.marks': [],
  'tool.foldLoop': [],
  'tool.inspect': [],
  'tool.scarecrows': [],
  'tool.stones': [],
  'tool.layers': [],
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
  'codex.unlocked': [],
  'codex.title': [],
  'codex.contents': [],
  'codex.closedPage': ['number'],
  'codex.closedLink': [],
  'codex.new': [],
  'codex.previous': [],
  'codex.next': [],
  'codex.close': [],
  'codex.keys': [],
  'diagram.dawn': [],
  'diagram.help.join': [],
  'diagram.help.pass': [],
  'diagram.help.split': [],
  'diagram.help.chain': [],
  'diagram.help.replay': [],
  'diagram.garden': [],
  'diagram.sprout.dark': ['name'],
  'diagram.sprout.lit': ['name'],
  'diagram.sprout.touched': [],
  'diagram.mark.sun': [],
  'diagram.mark.moon': [],
  'diagram.vine.lit': ['u', 'v'],
  'diagram.vine.dark': ['u', 'v'],
  'diagram.reset': [],
  'diagram.passChain': [],
  'diagram.sun': [],
  'diagram.stepBack': [],
  'diagram.stepForward': [],
  'diagram.step': ['step', 'count'],
  'diagram.help.pond': [],
  'diagram.pond.yours': [],
  'diagram.pond.mirror': [],
  'diagram.pond.together': [],
  'diagram.pond.pieces': [],
  'diagram.pond.count': ['yours', 'mirror'],
  'diagram.pond.thread': ['path', 'yours', 'mirror'],
  'diagram.pond.loop': ['path', 'yours', 'mirror'],
  'diagram.pond.gain': ['gain'],
  'diagram.pond.tie': [],
  'diagram.pond.loss': ['gain'],
  'diagram.pond.none': [],
  'diagram.help.cover': [],
  'diagram.cover.moons': [],
  'diagram.cover.count': ['guarded', 'vines', 'scarecrows', 'lanterns'],
  'diagram.cover.all': ['scarecrows'],
  'diagram.cover.tight': [],
  'diagram.help.cut': [],
  'diagram.cut.open': [],
  'diagram.cut.folded': [],
  'diagram.cut.show': [],
  'diagram.cut.clear': [],
  'diagram.cut.start': [],
  'diagram.cut.drawing': [],
  'diagram.cut.away': ['chain'],
  'diagram.cut.stretch': ['chain', 'outside', 'stretch'],
  'diagram.help.stones': [],
  'diagram.stones.moons': [],
  'diagram.stones.count': ['odd', 'stones', 'least', 'dark'],
  'diagram.stones.bound': ['bound'],
  'diagram.stones.tight': ['lanterns'],
  'diagram.help.recipe': [],
  'diagram.recipe.dawn': [],
  'diagram.recipe.following': [],
  'diagram.recipe.whole': [],
  'diagram.event.searchStart': ['roots'],
  'diagram.event.searchStartNone': [],
  'diagram.event.root': ['vertex'],
  'diagram.event.labelOuter': ['vertex', 'parent'],
  'diagram.event.labelInner': ['vertex', 'parent'],
  'diagram.event.scanEdge': ['from', 'to'],
  'diagram.event.oddCycleFound': ['u', 'v'],
  'diagram.event.contract': ['petals', 'base'],
  'diagram.event.expand': [],
  'diagram.event.augment': ['path'],
  'diagram.event.searchFailed': [],
  'diagram.event.done': ['count'],
  'diagram.event.light': ['u', 'v'],
  'diagram.event.putOut': ['u', 'v'],
  'diagram.event.inspect': ['vertex'],
  'diagram.event.chainFound': ['path'],
  'diagram.event.searchCleared': [],
  'diagram.event.scarecrowPlaced': ['vertex'],
  'diagram.event.scarecrowRemoved': ['vertex'],
  'diagram.event.stoneLifted': ['vertex'],
  'diagram.event.stoneDropped': ['vertex'],
  'diagram.event.declareDone': [],
  'hub.codex': [],
  'hud.book': [],
  'counterexample.back': [],
  'pond.strands': ['count'],
  'mirror.notBetter': ['drawn', 'yours'],
  'mirror.chain': [],
  'mirror.again': [],
  'mirror.spared': [],
  'flower.spared': [],
  'flower.ends': [],
  'flower.stretch': [],
  'flower.whole': [],
  'flower.folded': [],
  'flower.again': [],
  'recipe.mark': [],
  'recipe.cases': [],
  'recipe.end': [],
  'recipe.table': [],
  'recipe.empty': [],
  'recipe.check': [],
  'recipe.right': [],
  'race.title': ['count'],
  'race.counter.brutoAsleep': [],
  'race.legend.automaton': [],
  'race.legend.bruto': [],
  'race.axis.steps': [],
  'race.axis.sprouts': [],
  'race.asleep': [],
  'raceBet.revealRight': ['runner', 'answer'],
  'raceBet.revealWrong': ['runner', 'answer', 'bet'],
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
  'settings.title': [],
  'settings.volume': ['percent'],
  'settings.mute': [],
  'settings.close': [],
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
  // The recipe cards (GDD 6.1): each card's text, why each distractor is wrong, which case is
  // missing, and the level that taught it.
  ...Object.fromEntries(RECIPE_CARDS.map((card) => [cardTextKey(card.id), []])),
  ...Object.fromEntries(
    RECIPE_CARDS.filter((card) => !card.right).map((card) => [
      failureTextKey({ kind: 'distractor', card: card.id, case: card.case }),
      [],
    ]),
  ),
  ...Object.fromEntries(
    RECIPE_CASES.map((recipeCase) => [
      failureTextKey({ kind: 'missing', card: 'markDarkSuns', case: recipeCase }),
      [],
    ]),
  ),
  [RECALL_KEY]: ['level'],
  // The three answers of a doubling bet (GDD 6.5).
  ...Object.fromEntries(DOUBLING_ANSWERS.map((answer) => [doublingTextKey(answer), []])),
  ...Object.fromEntries(RUNNERS.map((runner) => [`raceBet.runner.${runner}`, []])),
  // The counters of a race (GDD 6.4): each runner's steps, running and once finished.
  ...Object.fromEntries(
    RUNNERS.flatMap((runner) => [
      [`race.counter.${runner}`, ['steps']],
      [`race.counter.${runner}Done`, ['steps']],
    ]),
  ),
  // The name of each named chapter, over its levels in the hub.
  ...Object.fromEntries(NAMED_CHAPTERS.map((chapter) => [`hub.chapterName.${chapter}`, []])),
  // The name of each tab of a Codex entry, on its tab in the book.
  ...Object.fromEntries(CODEX_TABS.map((tab) => [`codex.tab.${tab}`, []])),
  // The name of each audio channel, beside its slider in the settings panel.
  ...Object.fromEntries(AUDIO_CHANNELS.map((channel) => [`settings.${channel}`, []])),
  // The name of each speaker, on the tab of the dialogue box.
  ...Object.fromEntries(SPEAKERS.map((speaker) => [`speaker.${speaker}`, []])),
};
