import { describe, expect, it } from 'vitest';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import type { Rect } from '../src/game/picture/boxDistance';
import { focusRing } from '../src/game/picture/focusRing';
import { epilogueSignAt } from '../src/game/picture/hubLayout';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import { secretFlowerPicture } from '../src/game/picture/secretFlower';
import { epilogueReached } from '../src/game/systems/epilogue';
import {
  firstSpot,
  moveFocus,
  reachable,
  readingOrder,
  type FocusSpot,
} from '../src/game/input/focusOrder';
import { catalog } from '../src/levels/catalog';
import { codexSources, openCodex } from '../src/services/codexProgress';
import { unlockedLevels, visibleLevels } from '../src/services/progress';
import { sandboxAccess } from '../src/services/sandboxAccess';
import { emptySave, recordCompletion, recordNotebook, type SaveData } from '../src/services/save';
import { secretFlowers } from '../src/services/secretFlowers';
import { entries, hubOf, t } from './support/hubBoxes';

// The keyboard on the hub (plan 09, phase 4), with the real catalog and the real words, as
// `HubScene` lays it out: on a fresh hub, halfway and with everything won, and in teacher mode, Tab
// visits every pressable thing (the signs, the gear, the flowers, the open levels, the epilogue's
// sign) once and comes back to where it started, chapter after chapter, and the focus ring of each
// stays on the canvas without covering another thing's label.

/** The levels a player sees, in catalog order. */
const playable = visibleLevels(entries, false);

/** A save with the first `count` levels a player sees won with three stars, and their statements. */
function wonUpTo(count: number): SaveData {
  return playable
    .slice(0, count)
    .reduce((save, { id }) => recordNotebook(recordCompletion(save, id, 3), id), emptySave());
}

/** The hub's states the test walks: their name, the save and the mode. */
const STATES: readonly { name: string; save: SaveData; teacher: boolean }[] = [
  { name: 'a fresh hub', save: emptySave(), teacher: false },
  { name: 'halfway', save: wonUpTo(Math.floor(playable.length / 2)), teacher: false },
  { name: 'everything won', save: wonUpTo(playable.length), teacher: false },
  { name: 'teacher mode', save: emptySave(), teacher: true },
];

/** A pressable thing of the hub: what it is, for the messages, its box and depth. */
type Spot = FocusSpot<string>;

/** What the keyboard can reach on the hub in `save`, as the scene puts it in its focus. */
function hubSpots(save: SaveData, teacher: boolean): Spot[] {
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

/**
 * Whether a side of a ring (a one-pixel rectangle) touches `box` deeper than its outermost pixels,
 * where a label is.
 */
const ringCovers = (line: Rect, box: Rect): boolean =>
  line.x + line.width - 1 > box.x &&
  line.x < box.x + box.width - 1 &&
  line.y + line.height - 1 > box.y &&
  line.y < box.y + box.height - 1;

describe.each(STATES)('the keyboard on the hub: $name', ({ save, teacher }) => {
  const spots = hubSpots(save, teacher);

  it('has something to press, every level open among it, all of it within reach', () => {
    expect(spots.length).toBeGreaterThan(1);
    expect(spots.map((spot) => spot.id)).toContain('gear');
    expect(reachable(spots, [])).toEqual(spots);
  });

  it('Tab visits every pressable thing once and comes back to the first', () => {
    const first = firstSpot(spots);
    expect(first).not.toBeNull();
    const seen: string[] = [];
    let at = first;
    for (let i = 0; i < spots.length; i += 1) {
      at = moveFocus(spots, at, 'next');
      seen.push(at ?? '');
    }
    expect(at).toBe(first);
    expect([...seen].sort()).toEqual(spots.map((spot) => spot.id).sort());
  });

  it('reads the top line first, then each chapter in order, its flower before its levels', () => {
    const order = readingOrder(spots.map((spot) => spot.box)).map((i) => spots[i]?.id ?? '');
    const levelsRead = order.filter((id) => /^\d+\.\d+$/.test(id));
    const chapterOf = (id: string): number => Number(id.split('.')[0]);
    for (let i = 1; i < levelsRead.length; i += 1) {
      expect(chapterOf(levelsRead[i] ?? '')).toBeGreaterThanOrEqual(
        chapterOf(levelsRead[i - 1] ?? ''),
      );
    }
    const firstLevel = order.findIndex((id) => /^\d+\.\d+$/.test(id));
    expect(order.indexOf('gear')).toBeLessThan(firstLevel);
    for (const id of order.filter((one) => one.startsWith('flower '))) {
      const chapter = id.slice('flower '.length).split('.')[0];
      const own = order.findIndex((one) => one.startsWith(`${chapter}.`));
      if (own >= 0) expect(order.indexOf(id)).toBeLessThan(own);
    }
  });

  it("the ring of each thing in focus covers no other thing's label", () => {
    const covered: string[] = [];
    for (const spot of spots) {
      for (const line of focusRing(spot.box)) {
        for (const other of spots) {
          if (other !== spot && ringCovers(line, other.box))
            covered.push(`${spot.id} over ${other.id}`);
        }
      }
    }
    expect(covered).toEqual([]);
  });
});

describe('the hub with everything won', () => {
  it('has the flowers, every sign and the way to the epilogue to walk', () => {
    const ids = hubSpots(wonUpTo(playable.length), false).map((spot) => spot.id);
    for (const id of ['codex', 'notebook', 'sandbox', 'epilogue']) expect(ids).toContain(id);
    expect(ids.some((id) => id.startsWith('flower '))).toBe(true);
    expect(ids.filter((id) => /^\d+\.\d+$/.test(id)).length).toBe(
      playable.filter((level) => level.secret === undefined).length,
    );
  });
});
