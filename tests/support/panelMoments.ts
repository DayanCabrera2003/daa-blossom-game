import type { Level } from '@levels/build';
import type { Controller } from '@game/systems/levelController';
import { garden } from '@game/systems/levelSession';
import { questionAt, type Question } from '@game/systems/question';
import { playWalkthrough } from '@game/systems/walkthrough';

/** A question of a level's script on screen, with the controller as the scene holds it then. */
export interface QuestionMoment {
  readonly step: number;
  readonly question: Question;
  readonly controller: Controller;
}

/**
 * Every question a level's walkthrough meets, once each, with the garden as it is when its panel
 * opens: the walkthrough is played a prefix at a time, and each prefix ends where the script waits
 * (a question waits for its answer). A script step asked again after a wrong answer is kept once.
 */
export function questionMoments(level: Level): QuestionMoment[] {
  const moments: QuestionMoment[] = [];
  const seen = new Set<number>();
  for (let played = 0; played <= level.walkthrough.length; played += 1) {
    const { controller } = playWalkthrough({
      ...level,
      walkthrough: level.walkthrough.slice(0, played),
    });
    const step = controller.session.flow.index;
    const question = questionAt(level, step, garden(controller.session));
    if (question === null || seen.has(step)) continue;
    seen.add(step);
    moments.push({ step, question, controller });
  }
  return moments;
}
