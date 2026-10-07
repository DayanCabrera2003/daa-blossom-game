import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import {
  BLOOM,
  automatonLevel,
  betrayalLevel,
  bloomLevel,
  brokenRecipeLevel,
  lightLevel,
  recipeLevel,
} from '../../../tests/support/fixtureLevels';
import { size } from '@core/matching/queries';
import { garden } from './levelSession';
import { playWalkthrough } from './walkthrough';

/** A path A–B–C with the script `flow` and the walkthrough `solution`. */
const scripted = (flow: unknown[], solution: unknown[]): Level => {
  const plays = flow.some((step) => (step as { step: string }).step === 'play');
  const loaded = loadLevel({
    id: '2.9',
    sprouts: [
      { label: 'A', x: 100, y: 100 },
      { label: 'B', x: 200, y: 100 },
      { label: 'C', x: 300, y: 100 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
    ],
    mirror: [['A', 'B']],
    goal: { visible: false },
    ...(plays ? { victory: { type: 'matchingSize', value: 1 } } : {}),
    flow,
    solution,
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};
/** Loads a level file that must load. */
const load = (json: unknown): Level => {
  const loaded = loadLevel(json);
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};
const question = {
  step: 'ask',
  prompt: 'ch2.9.sauce.01',
  options: [
    { line: 'ch2.9.sauce.02', correct: false },
    { line: 'ch2.9.sauce.03', correct: true },
  ],
  retry: true,
};

describe('playing a walkthrough with the recipe (6.1, 6.3)', () => {
  it('builds each recipe with touches on its cards and checks it, until one is right', () => {
    const result = playWalkthrough(recipeLevel());
    expect(result.problem).toBeNull();
    const checks = result.effects.flatMap((effect) =>
      effect.kind === 'recipeChecked' ? [effect.verdict] : [],
    );
    expect(checks).toEqual([
      {
        right: false,
        failure: { kind: 'distractor', card: 'moonToSun', case: 'moon' },
      },
      { right: true },
    ]);
    expect(result.effects.at(-1)).toMatchObject({ kind: 'won' });
  });

  it('repairs the broken recipe, taking back nothing it keeps', () => {
    expect(playWalkthrough(brokenRecipeLevel()).problem).toBeNull();
  });

  it('the automaton runs as the scene reports each run shown, between the recipes (6.3)', () => {
    const played = playWalkthrough(automatonLevel());
    expect(played.problem).toBeNull();
    expect(played.effects.map((effect) => effect.kind)).toEqual([
      'recipe',
      'recipeChecked',
      'automaton',
      'recipe',
      'recipeChecked',
      'automaton',
      'won',
    ]);
    expect(size(garden(played.controller.session).matching)).toBe(4);
  });

  it('a recipe given outside its step is not waited for', () => {
    const level = load({ ...BLOOM, solution: [{ type: 'recipe', cards: ['foldFlower'] }] });
    expect(playWalkthrough(level).problem).toEqual({ code: 'inputIgnored', entry: 0 });
  });
});

describe('playing the reference walkthrough of a level without a scene', () => {
  it('plays moves with gestures and script inputs as interface events, to the end', () => {
    const level = scripted(
      [
        { step: 'bet', prompt: 'ch2.9.sauce.04', range: 2 },
        { step: 'play' },
        { step: 'sun' },
        question,
      ],
      [
        { type: 'bet', value: 1 },
        { type: 'join', u: 'B', v: 'C' },
        { type: 'seekSun', fraction: 0 },
        { type: 'answer', option: 0 },
        { type: 'answer', option: 1 },
      ],
    );
    const played = playWalkthrough(level);
    expect(played.problem).toBeNull();
    expect(played.controller.session.won).toEqual({ total: 3, noHints: true, withinWater: null });
    expect(played.effects.map((effect) => effect.kind)).toEqual([
      'bet',
      'answered',
      'play',
      'animate',
      'reveal',
      'sun',
      'ask',
      'answered',
      'ask',
      'answered',
      'won',
    ]);
  });

  it('touches go to the steps that wait for them', () => {
    const level = scripted(
      [{ step: 'mirror' }, { step: 'explore' }, { step: 'separate' }],
      [{ type: 'tapSprout', vertex: 'B' }, { type: 'tapGarden' }],
    );
    expect(playWalkthrough(level).problem).toBeNull();
  });

  it('a vine pointed at is touched where the garden shows it (4.2)', () => {
    const played = playWalkthrough(betrayalLevel());
    expect(played.problem).toBeNull();
    expect(played.effects.map((effect) => effect.kind)).toEqual([
      'play',
      'animate',
      'animate',
      'animate',
      'pickVine',
      'vinePicked',
      'count',
      'answered',
      'won',
    ]);
  });

  it('the light searches by itself as the scene would show it, with no entry of its own', () => {
    const played = playWalkthrough(lightLevel());
    expect(played.problem).toBeNull();
    expect(played.effects.map((effect) => effect.kind)).toEqual([
      'autoSearch',
      'pickVine',
      'vinePicked',
      'count',
      'answered',
      'won',
    ]);
  });

  it('a chain drawn in the flower challenge is dragged through its sprouts (4.11)', () => {
    const played = playWalkthrough(bloomLevel());
    expect(played.problem).toBeNull();
    expect(played.effects.map((effect) => effect.kind)).toEqual([
      'say',
      'flowerChallenge',
      'flowerDrawn',
      'flowerDrawn',
      'flowerDrawn',
      'say',
      'won',
    ]);
  });

  it('a chain the drag cannot follow, or that draws nothing, is a problem', () => {
    const astray = { ...BLOOM, solution: [{ type: 'drawChain', path: ['t', 'g', 'b', 'c'] }] };
    expect(playWalkthrough(load(astray)).problem).toEqual({ code: 'gestureMismatch', entry: 0 });
    const lit = { ...BLOOM, solution: [{ type: 'drawChain', path: ['x', 'h'] }] };
    expect(playWalkthrough(load(lit)).problem).toEqual({ code: 'inputIgnored', entry: 0 });
  });

  it('a move the level refuses stops the walkthrough, saying which and why', () => {
    const level = scripted([question, { step: 'play' }], [{ type: 'join', u: 'A', v: 'B' }]);
    const played = playWalkthrough(level);
    expect(played.problem).toEqual({ code: 'moveRefused', entry: 0, reason: { code: 'notNow' } });
  });

  it('an input the script does not wait for is reported', () => {
    const level = scripted([{ step: 'play' }], [{ type: 'answer', option: 1 }]);
    expect(playWalkthrough(level).problem).toEqual({ code: 'inputIgnored', entry: 0 });
  });

  it('a walkthrough that leaves the script unfinished is reported', () => {
    const level = scripted([{ step: 'play' }, question], [{ type: 'join', u: 'A', v: 'B' }]);
    const played = playWalkthrough(level);
    expect(played.problem).toEqual({ code: 'unfinished', step: 1 });
    expect(garden(played.controller.session).matching.mate).toEqual([1, 0, -1]);
  });

  it('a move no gesture can make is reported, not thrown', () => {
    // C sits on the vine A–B, so the vine cannot be touched apart from its sprouts.
    const loaded = loadLevel({
      id: '1.9',
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 120, y: 100 },
        { label: 'C', x: 110, y: 100 },
      ],
      vines: [['A', 'B']],
      lanterns: [['A', 'B']],
      goal: { visible: false },
      victory: { type: 'matchingSize', value: 0 },
      solution: [{ type: 'split', u: 'A', v: 'B' }],
    });
    if (!loaded.ok) throw new Error('fixture does not load');
    expect(playWalkthrough(loaded.value).problem).toMatchObject({
      code: 'gestureImpossible',
      entry: 0,
    });
  });

  it('the mirror challenge plays through its drawn reflections and their checks', () => {
    const level = scripted(
      [{ step: 'draw', attempts: 1 }],
      [{ type: 'drawMirror', lanterns: [['A', 'B']] }, { type: 'checkMirror' }],
    );
    expect(playWalkthrough(level).problem).toBeNull();
    const short = scripted([{ step: 'draw', attempts: 2 }], [{ type: 'checkMirror' }]);
    expect(playWalkthrough(short).problem).toEqual({ code: 'unfinished', step: 0 });
  });

  it('a reflection is drawn with touches on its vines: a hidden vine or a refusal is reported', () => {
    const refused = scripted(
      [{ step: 'draw', attempts: 1 }],
      [
        {
          type: 'drawMirror',
          lanterns: [
            ['A', 'B'],
            ['B', 'C'],
          ],
        },
        { type: 'checkMirror' },
      ],
    );
    expect(playWalkthrough(refused).problem).toEqual({
      code: 'moveRefused',
      entry: 0,
      reason: { code: 'twoSilver', vertex: 1 },
    });
    // C sits on the vine A–B, so the vine cannot be touched apart from its sprouts.
    const loaded = loadLevel({
      id: '2.9',
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 120, y: 100 },
        { label: 'C', x: 110, y: 100 },
      ],
      vines: [['A', 'B']],
      goal: { visible: false },
      flow: [{ step: 'draw', attempts: 1 }],
      solution: [{ type: 'drawMirror', lanterns: [['A', 'B']] }, { type: 'checkMirror' }],
    });
    if (!loaded.ok) throw new Error('fixture does not load');
    expect(playWalkthrough(loaded.value).problem).toMatchObject({
      code: 'gestureImpossible',
      entry: 0,
    });
  });

  it('every level of the catalog plays through', () => {
    for (const level of catalog()) expect(playWalkthrough(level).problem).toBeNull();
  });
});
