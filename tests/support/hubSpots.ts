import { estimatedButtonWidth } from '../../src/game/picture/bottomRows';
import { epilogueSignAt } from '../../src/game/picture/hubLayout';
import { BUTTON_HEIGHT } from '../../src/game/picture/panelLayout';
import { secretFlowerPicture } from '../../src/game/picture/secretFlower';
import { epilogueReached } from '../../src/game/systems/epilogue';
import type { FocusSpot } from '../../src/game/input/focusOrder';
import { catalog } from '../../src/levels/catalog';
import { codexSources, openCodex } from '../../src/services/codexProgress';
import { unlockedLevels, visibleLevels } from '../../src/services/progress';
import { sandboxAccess } from '../../src/services/sandboxAccess';
import {
  emptySave,
  recordCompletion,
  recordNotebook,
  type SaveData,
} from '../../src/services/save';
import { secretFlowers } from '../../src/services/secretFlowers';
import { entries, hubOf, t } from './hubBoxes';

// What can be pressed on the hub, as `HubScene` puts it in the keyboard's focus and takes touches
// on it, in the states the tests walk: fresh, halfway, everything won, and in teacher mode.

/** The levels a player sees, in catalog order. */
export const playable = visibleLevels(entries, false);

/** A save with the first `count` levels a player sees won with three stars, and their statements. */
export function wonUpTo(count: number): SaveData {
  return playable
    .slice(0, count)
    .reduce((save, { id }) => recordNotebook(recordCompletion(save, id, 3), id), emptySave());
}

/** The hub's states the test walks: their name, the save and the mode. */
export const STATES: readonly { name: string; save: SaveData; teacher: boolean }[] = [
  { name: 'a fresh hub', save: emptySave(), teacher: false },
  { name: 'halfway', save: wonUpTo(Math.floor(playable.length / 2)), teacher: false },
  { name: 'everything won', save: wonUpTo(playable.length), teacher: false },
  { name: 'teacher mode', save: emptySave(), teacher: true },
];

/** A pressable thing of the hub: what it is, for the messages, its box and depth. */
export type Spot = FocusSpot<string>;

/** What the keyboard can reach on the hub in `save`, as the scene puts it in its focus. */
export function hubSpots(save: SaveData, teacher: boolean): Spot[] {
  const { pressables, signs } = hubOf(teacher);
  const shown = visibleLevels(entries, teacher);
  const open = unlockedLevels(shown, save, teacher);
  const spots: Spot[] = [{ id: 'gear', box: pressables.gear, depth: 100 }];
  // The signs that are there, right to left from the gear.
  const topSigns = [
    openCodex(codexSources(catalog()), save, teacher).size > 0 ? 'codex' : null,
    save.notebook.length > 0 || teacher ? 'notebook' : null,
    sandboxAccess(entries, save, teacher).exists ? 'sandbox' : null,
  ].filter((sign) => sign !== null);
  topSigns.forEach((sign, i) => {
    const box = pressables.topSigns[i];
    if (box !== undefined) spots.push({ id: sign, box, depth: 100 });
  });
  for (const { id, box } of pressables.levels) {
    if (open.has(id)) spots.push({ id, box, depth: 100 });
  }
  for (const flower of secretFlowers(entries, save, teacher)) {
    const place = signs.get(flower.chapter);
    if (place === undefined) continue;
    const { hit } = secretFlowerPicture(flower.state, place.cell, place.sign);
    if (hit !== null) spots.push({ id: `flower ${flower.id}`, box: hit, depth: 2 });
  }
  if (epilogueReached(save, teacher)) {
    const width = estimatedButtonWidth(t('epilogue.title'));
    const at = epilogueSignAt(width, BUTTON_HEIGHT);
    spots.push({
      id: 'epilogue',
      box: { x: at.x, y: at.y - 1, width, height: BUTTON_HEIGHT },
      depth: 100,
    });
  }
  return spots;
}
