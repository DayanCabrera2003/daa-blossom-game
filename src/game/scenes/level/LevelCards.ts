import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import { cardDemos } from '@levels/cards/catalog';
import type { CardDemo } from '@levels/cards/demo';
import type { CardId } from '@levels/cards/schema';
import { recordTutorialSeen, writeSave } from '@services/save';
import { helpCards, offerCards } from '../../systems/tutorials';
import type { ShownCard } from '../../view/TutorialView';
import type { GameContext } from '../context';
import type { Presenter } from '../presenter';

/** Every mechanic card's demo, built once for the whole game the first time a level opens. */
let demos: ReadonlyMap<CardId, CardDemo> | null = null;

/**
 * The mechanic cards of one level (GDD §5.11): which to queue on the presenter, the "?" that shows
 * them again, each card in the player's words, and the save that remembers a card was seen. Which
 * cards are due is decided by the pure `systems/tutorials.ts`; this only carries it out.
 */
export class LevelCards {
  /** The cards the player has seen, or that wait their turn in this level: none is queued twice. */
  private offered: ReadonlySet<string>;

  constructor(
    private readonly context: GameContext,
    private readonly presenter: Presenter,
  ) {
    demos ??= cardDemos();
    this.offered = new Set(context.save.tutorialsSeen);
  }

  /** The cards seen or already waiting, to tell which cards a step still brings. */
  get seen(): ReadonlySet<string> {
    return this.offered;
  }

  /** Queues the mechanic cards among `candidates` that are neither seen nor already waiting. */
  offer(candidates: readonly CardId[]): void {
    const { cards, offered } = offerCards(this.offered, candidates);
    this.offered = offered;
    for (const card of cards) this.presenter.present({ kind: 'tutorial', card });
  }

  /**
   * "?": the cards of what `level` has open at step `step`, again, one after another; seen or not,
   * and not queued a second time while they are still showing.
   */
  help(level: Level, step: number): void {
    if (this.presenter.cardsQueued) return;
    for (const card of helpCards(level, step)) this.presenter.present({ kind: 'tutorial', card });
  }

  /** A mechanic card in the player's words, with its demo. */
  shown(card: CardId): ShownCard {
    const demo = demos?.get(card);
    invariant(demo !== undefined, `the cards file has a demo for ${card}`);
    const { t } = this.context;
    return { title: t(`tutorial.${card}.title`), body: t(`tutorial.${card}.body`), demo };
  }

  /** A closed card is seen for good: saved at once, so it never shows by itself again. */
  closed(card: CardId): void {
    this.context.save = recordTutorialSeen(this.context.save, card);
    writeSave(this.context.storage, this.context.save);
  }
}
