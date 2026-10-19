import type { GardenState } from '@core/rules/state';
import type { SproutKind } from '@levels/fields';
import type { PreviewMode } from '../../input/previewMode';
import { backdropPicture, seedOf, siteOf } from '../../picture/backdrop';
import { backdropTint } from '../../picture/dayTint';
import { foundTrailPicture } from '../../picture/foundTrail';
import { NO_EXTRAS, type PointingExtras } from '../../picture/garden';
import { hudPicture } from '../../picture/hud';
import { layerPicture } from '../../picture/layerPicture';
import { moonGlow } from '../../picture/moonGlow';
import { pondPicture } from '../../picture/pond';
import { racePicture, type RaceClock } from '../../picture/racePanel';
import { recipePicture } from '../../picture/recipePanel';
import { sideBySidePicture } from '../../picture/sideBySide';
import { splitBadges } from '../../picture/splitBadge';
import type { FlowerAttempt } from '../../systems/flowerChallenge';
import { layerOf, type Controller } from '../../systems/levelController';
import { garden } from '../../systems/levelSession';
import { foundChain } from '../../systems/liftGaps';
import { RACE_LAYOUT } from '../../view/RaceView';
import type { LevelViews } from './levelViews';

/** How often the HUD is refreshed while nothing happens, so a hint shows up when it is due. */
const HUD_REFRESH_MS = 500;

/**
 * The level in the player's words: names of the sprouts, and which are bees or flowers; and how its
 * screen looks (`systems/levelScreenOf.ts`): its season, and the level whose interface it shows.
 */
export interface LevelLook {
  readonly labels: readonly string[];
  /** Which sprouts are bees or flowers; empty in a garden that has none. */
  readonly kinds: readonly (SproutKind | undefined)[];
  /** The chapter whose season the backdrop wears. */
  readonly season: string;
  /** The level whose pieces of the interface the HUD shows (the sun, the layers, the Council). */
  readonly interfaceAt: string;
  /** How much a dragged chain tells: its gain, or only whether it is legal (chapter 3 on). */
  readonly chainPreview: PreviewMode;
}

/** What the renderer reads every time it paints: the controller now and the replayed sun. */
export interface RenderSource {
  readonly controller: () => Controller;
  /** Where the sun stands in the day replaying now, or null when nothing replays. */
  readonly replaySun: () => { readonly fraction: number } | null;
  /** The race running on screen and how long since it began, or null when none runs. */
  readonly raceClock: () => RaceClock | null;
}

/**
 * Paints the level screen from the pure pictures of the garden, the pond, the flower challenge, the
 * recipe, the races and the HUD. It takes no decision: every layer is a picture of the controller as it is now (or of
 * one state of a replayed day). It keeps only what timing needs: when the chain drawn in the flower
 * challenge started its moments, and when the HUD was last refreshed.
 */
export class LevelRenderer {
  /** The last chain drawn in the flower challenge, and since when it shows, to time its moments. */
  private cutShown: FlowerAttempt | null = null;
  private cutSince = 0;
  /** Whether the moments of the chain shown are still moving on. */
  private cutMoving = false;
  private lastHudRefresh = 0;
  /** The colour of the season of the level's chapter, which the hour of the sun multiplies. */
  private readonly seasonTint: number;

  constructor(
    private readonly views: LevelViews,
    private readonly look: LevelLook,
    private readonly source: RenderSource,
  ) {
    // The backdrop of the level is painted once: it depends on the level alone.
    const { level } = source.controller().session;
    const backdrop = backdropPicture(siteOf(level), look.season);
    views.backdrop.paint(backdrop);
    views.backdrop.setDrift(backdrop.season.drift, seedOf(level.data.id));
    this.seasonTint = backdrop.season.tint;
  }

  /**
   * Moves on what plays by itself: the mirror, the moments of a chain cut at the flower, and the
   * counters of a race running.
   */
  update(time: number): void {
    this.views.backdrop.update(time);
    this.views.mirror.update(time);
    if (this.cutMoving) this.renderSideBySide(time);
    if (this.source.raceClock() !== null) this.renderRace();
  }

  /** Refreshes the HUD now and then, so a hint shows up when it is due. */
  refreshHud(time: number): void {
    if (time - this.lastHudRefresh > HUD_REFRESH_MS) {
      this.lastHudRefresh = time;
      this.renderHud(time);
    }
  }

  /** Repaints the garden as the session shows it, with what the player is pointing at. */
  render(now: number): void {
    const controller = this.source.controller();
    const { session, pointer, vineGlow } = controller;
    const state = garden(session);
    // What a hint lights up, and in 7.4 the moons of the search over, still to be lifted.
    const moons = moonGlow(session.level.data.victory, state);
    const highlight = [...new Set([...controller.highlight, ...moons])];
    this.renderGarden(
      state,
      {
        selection: pointer.selection,
        highlight,
        chain: pointer.chain,
        vineGlow,
        previewMode: this.look.chainPreview,
      },
      splitBadges(session),
    );
    // The stretches of the chain the light found stay drawn until the lanterns change.
    const view = layerOf(controller, state);
    const found = foundChain(session.history.states, session.history.cursor);
    const insideLayer = view.path.length > 0;
    this.views.foundTrail.render(foundTrailPicture(found, state, view.positions, insideLayer));
    const pond = pondPicture(session, controller.positions, this.look.labels);
    this.views.mirror.render(pond, now);
    this.renderSideBySide(now);
    this.views.recipe.render(recipePicture(session));
    this.renderRace();
    this.renderHud(now);
  }

  /** Repaints the race panel (6.4, 6.5), its counters on the clock of the race running. */
  private renderRace(): void {
    const { session } = this.source.controller();
    this.views.race.render(racePicture(session, this.source.raceClock(), RACE_LAYOUT));
  }

  /** Shows one state of a replayed day, with the sun where the replay stands. */
  renderReplayed(state: GardenState, now: number): void {
    this.renderGarden(state, NO_EXTRAS);
    this.views.foundTrail.render([]);
    this.renderHud(now);
  }

  /**
   * Repaints the flower challenge (4.11): the folded garden beside the open one, and the last chain
   * drawn at the moment of the argument it has reached; a new chain starts its moments at `now`.
   */
  private renderSideBySide(now: number): void {
    const { session, positions } = this.source.controller();
    if (session.flower.shown !== this.cutShown) {
      this.cutShown = session.flower.shown;
      this.cutSince = now;
    }
    const picture = sideBySidePicture(session, positions, this.look.labels, now - this.cutSince);
    this.views.sideBySide.render(picture);
    this.cutMoving = (picture?.cut?.moment ?? 3) < 3;
  }

  /**
   * Repaints every layer of the garden from one state of it, as the flower entered with the layers
   * shows it (5.2); the sprouts in `split` wear the split badge (4.2), which a replayed day never
   * shows.
   */
  private renderGarden(
    state: GardenState,
    extras: PointingExtras,
    split: readonly number[] = [],
  ): void {
    const { labels, kinds } = this.look;
    const view = layerOf(this.source.controller(), state);
    const picture = layerPicture(state, view, labels, extras, kinds);
    this.views.fog.render(picture);
    this.views.flowers.render(picture.flowers);
    this.views.objects.render(picture);
    this.views.garden.render(picture);
    this.views.marks.render(picture.sprouts, split);
  }

  /** Repaints the HUD; while the day replays, the sun follows the replay instead of the session. */
  private renderHud(now: number): void {
    const controller = this.source.controller();
    const { session, pointer } = controller;
    const depth = layerOf(controller).path.length;
    const hud = hudPicture(session, pointer, now, depth, this.look.interfaceAt);
    this.views.hud.render(hud);
    this.views.toolbar.render(hud.tools, hud.tool);
    const replayed = this.source.replaySun();
    const sun = replayed === null || hud.sun === null ? hud.sun : { ...replayed, calling: false };
    this.views.sun.render(sun);
    // The backdrop follows the sun's hour; with no sun yet, the present: night.
    this.views.backdrop.tint(backdropTint(this.seasonTint, sun?.fraction ?? null));
  }
}
