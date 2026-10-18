import type Phaser from 'phaser';
import { newCosmetics, openCosmetics } from '@services/cosmetics';
import { catalogEntries } from '@services/progress';
import { recordCosmeticsSeen } from '@services/save';
import { seeds } from '@services/seeds';
import { totalStars } from '@services/starCount';
import type { Rect } from '../../picture/boxDistance';
import { hubCosmeticHomes } from '../../picture/hubCosmeticHomes';
import { MAX_SEEDLINGS } from '../../picture/seedlings';
import { HubCrittersView } from '../../view/HubCrittersView';
import { ToastView } from '../../view/ToastView';
import { contextOf } from '../context';
import { movesLess } from '../motion';
import { sayAloud } from '../sayAloud';

/** When the first notice of a new cosmetic shows after the hub opens, in milliseconds. */
const FIRST_NOTICE_MS = 800;
/** Between two notices: one has faded (`ToastView` keeps it 2.6 s) before the next shows. */
const NOTICE_EVERY_MS = 3400;

/** Where the cosmetics may go in the hub, as `HubScene` has laid it out. */
export interface HubCosmeticsPlace {
  /** Everything the player reads or presses on the hub. */
  readonly taken: readonly Rect[];
  /** The pond of the hub's garden, once planted, where the frog sits; null without it. */
  readonly pond: Rect | null;
  /** The signposts of the chapters, where the lanterns are lit. */
  readonly signs: readonly Rect[];
}

/**
 * The cosmetics of the hub (plan 08, phase 7): those the stars and seeds bring (all of them in
 * teacher mode, with a plant for every seed there could be) live in the homes found for them and
 * move gently, or stay still when the player's system asks for less motion. Each cosmetic that
 * comes for the first time is announced once, one notice after another, and kept in the save as
 * announced when its notice shows; teacher mode announces nothing and saves nothing.
 */
export function addHubCosmetics(scene: Phaser.Scene, place: HubCosmeticsPlace): void {
  const { catalog, saves, teacherMode, t } = contextOf(scene);
  const save = saves.get();
  const planted = seeds(save);
  const open = openCosmetics(
    { stars: totalStars(catalogEntries(catalog), save), seeds: planted },
    teacherMode,
  );
  const homes = hubCosmeticHomes(
    open,
    teacherMode ? MAX_SEEDLINGS : planted,
    place.taken,
    place.pond,
  );
  new HubCrittersView(scene, homes, place.signs, !movesLess(scene));
  if (teacherMode) return;

  const toast = new ToastView(scene, sayAloud(scene));
  newCosmetics(open, save).forEach((id, i) => {
    scene.time.delayedCall(FIRST_NOTICE_MS + i * NOTICE_EVERY_MS, () => {
      toast.show(t(`cosmetic.${id}`));
      saves.update((now) => recordCosmeticsSeen(now, [id]));
    });
  });
}
