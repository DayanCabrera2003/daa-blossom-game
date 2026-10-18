import { describe, expect, it } from 'vitest';
import { invariant } from '@core/shared/invariant';
import { catalog } from '@levels/catalog';
import type { Level } from '@levels/build';
import { questionMoments, type QuestionMoment } from '../../../tests/support/panelMoments';
import { rightLoopCount } from '../systems/answerKey';
import { layerOf, type Controller } from '../systems/levelController';
import { garden } from '../systems/levelSession';
import { gardenPicture, NO_EXTRAS, type PointingExtras } from './garden';
import { gardenShapes } from './gardenShapes';
import { layerPicture } from './layerPicture';
import { pondPicture } from './pond';
import { referredShapes } from './referredShapes';

const levels = catalog();

/** The level of the catalog with `id`. */
function levelOf(id: string): Level {
  const level = levels.find((candidate) => candidate.data.id === id);
  invariant(level !== undefined, `no level ${id}`);
  return level;
}

/** The question of `id` asked at script step `step`. */
function momentOf(id: string, step: number): QuestionMoment {
  const moment = questionMoments(levelOf(id)).find((candidate) => candidate.step === step);
  invariant(moment !== undefined, `no question at ${id} step ${step}`);
  return moment;
}

/** The pictures of the controller's garden and pond, as the renderer paints them. */
function picturesOf(controller: Controller, extras: PointingExtras = NO_EXTRAS) {
  const { session, positions } = controller;
  const labels = session.level.data.sprouts.map((sprout) => sprout.label);
  const state = garden(session);
  return {
    picture: layerPicture(state, layerOf(controller, state), labels, extras),
    pond: pondPicture(session, positions, labels),
  };
}

/** What the question of `id` at `step` points at, and everything the garden shows then. */
function referredAt(id: string, step: number) {
  const { controller } = momentOf(id, step);
  const { picture, pond } = picturesOf(controller);
  return {
    referred: referredShapes(controller.session, picture, pond),
    shown: gardenShapes(picture, pond),
    controller,
  };
}

describe('what the step on screen points at, for its panel to keep clear of', () => {
  it('2.2 asks about the thread through 1: its six sprouts and five strands, drifted', () => {
    const { referred, shown } = referredAt('2.2', 6);
    expect(referred).toHaveLength(6 * 2 + 5 * 2);
    // Exactly as the separated pond shows them.
    for (const shape of referred) expect(shown).toContainEqual(shape);
  });

  it('2.2 asks about the loop through a: its four sprouts and four strands', () => {
    expect(referredAt('2.2', 3).referred).toHaveLength(4 * 2 + 4 * 2);
  });

  it('2.5 asks how many threads the reflection wins: those threads, before they drift', () => {
    const { referred, shown } = referredAt('2.5', 2);
    expect(referred.length).toBeGreaterThan(0);
    for (const shape of referred) expect(shown).toContainEqual(shape);
  });

  it('4.2 asks how many sprouts the loop of the conflict holds: each of them', () => {
    const { referred, controller } = referredAt('4.2', 4);
    const sprouts = rightLoopCount(garden(controller.session));
    expect(sprouts).toBeGreaterThan(0);
    // A body and a name per sprout, and the vines of the loop between them.
    expect(referred.length).toBeGreaterThanOrEqual(2 * sprouts + sprouts);
  });

  it('an ask points at nothing in particular', () => {
    expect(referredAt('2.2', 9).referred).toEqual([]);
  });

  it('a hint points at the sprouts it lights and the vine it makes glow', () => {
    const { controller } = momentOf('2.2', 9);
    const [u, v] = [0, 1];
    const { picture, pond } = picturesOf(controller, {
      ...NO_EXTRAS,
      highlight: [u],
      vineGlow: [u, v],
    });
    expect(referredShapes(controller.session, picture, pond)).toHaveLength(2 + 1);
  });

  it('a garden with no script step on screen points at nothing', () => {
    const level = levelOf('1.1');
    const labels = level.data.sprouts.map((sprout) => sprout.label);
    const positions = level.data.sprouts.map(({ x, y }) => ({ x, y }));
    const picture = gardenPicture(level.start, positions, labels, NO_EXTRAS);
    const done = { ...momentOf('2.2', 9).controller.session, level };
    expect(referredShapes({ ...done, flow: { ...done.flow, index: 99 } }, picture, null)).toEqual(
      [],
    );
  });
});
