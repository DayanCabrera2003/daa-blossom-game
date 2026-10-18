import type { Level } from '@levels/build';
import type { Controller } from '@game/systems/levelController';
import { garden } from '@game/systems/levelSession';
import { questionAt, type Question } from '@game/systems/question';
import { playWalkthrough } from '@game/systems/walkthrough';

/** A step of a level's script on screen, with the controller as the scene holds it then. */
export interface ScriptMoment {
  readonly step: number;
  readonly controller: Controller;
}

/** A question of a level's script on screen, with the controller as the scene holds it then. */
export interface QuestionMoment extends ScriptMoment {
  readonly question: Question;
}

/**
 * Every step of a level's script its walkthrough waits at, once each, with the garden as it is
 * then: the walkthrough is played a prefix at a time, and each prefix ends where the script waits
 * (a question for its answer, a play step for the next move). A step met again (a play step after
 * each move, a question asked again after a wrong answer) is kept the first time.
 */
export function scriptMoments(level: Level): ScriptMoment[] {
  const moments: ScriptMoment[] = [];
  const seen = new Set<number>();
  for (let played = 0; played <= level.walkthrough.length; played += 1) {
    const { controller } = playWalkthrough({
      ...level,
      walkthrough: level.walkthrough.slice(0, played),
    });
    const step = controller.session.flow.index;
    if (seen.has(step)) continue;
    seen.add(step);
    moments.push({ step, controller });
  }
  return moments;
}

/** Every question a level's walkthrough meets, once each, with the garden as it is then. */
export const questionMoments = (level: Level): QuestionMoment[] =>
  scriptMoments(level).flatMap(({ step, controller }) => {
    const question = questionAt(level, step, garden(controller.session));
    return question === null ? [] : [{ step, question, controller }];
  });
