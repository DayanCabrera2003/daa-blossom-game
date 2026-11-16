import { applyAction } from '@core/rules/applyAction';
import type { Action } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { foldingLightLevel, lightLevel } from '../../../tests/support/fixtureLevels';
import { explore } from '../../../tests/support/gardenExplorer';
import { lightLabel, lightStop, stopReached, stopReason } from './lightStop';

/** Applies a move the rules must accept. */
const play = (state: GardenState, action: Action): GardenState => {
  const outcome = applyAction(state, action);
  if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
  return outcome.state;
};

/** The words of each refusal of «Avanzar la luz» on its button, once it is switched off. */
const WORDS: Readonly<Record<string, string>> = {
  lightAtFlower: 'hud.light.flower',
  vineHidden: 'hud.light.fog',
  lightFound: 'hud.light.found',
  lightDone: 'hud.light.done',
};

/**
 * The button tells the truth in a garden: switched off (a stop) exactly where pressing it would be
 * refused, the stop told with that refusal's reason and the button saying why.
 */
function expectButtonTrue(state: GardenState): void {
  const outcome = applyAction(state, { type: 'stepLight' });
  const stop = lightStop(state);
  if (outcome.ok) {
    expect(stop).toBeNull();
    expect(lightLabel(state)).toBe('hud.stepLight');
    return;
  }
  expect(stop).not.toBeNull();
  if (stop !== null) expect(stopReason(stop)).toEqual(outcome.reason);
  expect(lightLabel(state)).toBe(WORDS[outcome.reason.code]);
}

/**
 * The light advanced alone through a level, `check` run on every garden: folding where it stops
 * at a flower, inspecting where it stops in the fog, the chain it saw opened and lit, until it has
 * nothing left to look at. The kinds of the stops it met, in order.
 */
function lightAlone(level: Level, check: (state: GardenState) => void): string[] {
  let state = level.start;
  const stops: string[] = [];
  for (let guard = 0; guard < 500; guard++) {
    check(state);
    const stop = lightStop(state);
    if (stop === null) {
      state = play(state, { type: 'stepLight' });
      continue;
    }
    stops.push(stop.kind);
    if (stop.kind === 'flower') {
      state = play(state, { type: 'foldAt', from: stop.from, to: stop.to });
    } else if (stop.kind === 'fog') {
      state = play(state, { type: 'inspect', vertex: stop.vertex });
    } else if (stop.kind === 'found' && state.chainSeen !== null && state.allowed.has('chain')) {
      const chain = state.chainSeen;
      for (let top = state.layer.nodes.find((node) => node.kind === 'blossom'); top;) {
        state = play(state, { type: 'unfold', blossom: top.id });
        check(state);
        top = state.layer.nodes.find((node) => node.kind === 'blossom');
      }
      // In the fog, a chain goes only along vines seen: its sprouts are inspected first.
      for (const vertex of chain) {
        if (state.revealed !== null && state.revealed[vertex] !== true) {
          state = play(state, { type: 'inspect', vertex });
          check(state);
        }
      }
      state = play(state, { type: 'chain', path: chain });
    } else {
      break;
    }
  }
  return stops;
}

/** The levels of the catalog where the light searches by itself. */
const lightLevels = (): Level[] => catalog().filter((level) => level.data.light);

describe('the stop of the light, as a state of the garden', () => {
  it('a garden where the player searches by hand has no light, so no stop', () => {
    expect(lightStop(lightLevel().start)).toBeNull();
    expect(lightLabel(lightLevel().start)).toBe('hud.stepLight');
  });

  it('the light that still has a mark to make is not stopped, and the button keeps its name', () => {
    const start = foldingLightLevel().start;
    expect(lightStop(start)).toBeNull();
    expect(lightLabel(start)).toBe('hud.stepLight');
  });

  it('stops at a flower, says so, and goes on once the loop is folded', () => {
    let state = foldingLightLevel().start;
    for (let i = 0; i < 3; i++) state = play(state, { type: 'stepLight' });
    expect(lightStop(state)).toEqual({ kind: 'flower', from: 2, to: 4 });
    expect(lightLabel(state)).toBe('hud.light.flower');
    expect(stopReason({ kind: 'flower', from: 2, to: 4 })).toEqual({
      code: 'lightAtFlower',
      u: 2,
      v: 4,
    });
    const folded = play(state, { type: 'foldAt', from: 2, to: 4 });
    expect(lightStop(folded)).toBeNull();
    // Its next mark sees the chain: the light stops again, for another reason.
    const found = play(folded, { type: 'stepLight' });
    expect(lightStop(found)).toEqual({ kind: 'found' });
    expect(lightLabel(found)).toBe('hud.light.found');
    expect(stopReason({ kind: 'found' })).toEqual({ code: 'lightFound' });
  });

  it('names each stop with its own words', () => {
    expect(stopReason({ kind: 'fog', vertex: 3 })).toEqual({ code: 'vineHidden', vertex: 3 });
    expect(stopReason({ kind: 'done' })).toEqual({ code: 'lightDone' });
  });

  it('stops before a sun still in the fog, until it is inspected', () => {
    const level = catalog().find((candidate) => candidate.data.id === '4.12');
    if (level === undefined) throw new Error('no level 4.12');
    let state = level.start;
    for (let guard = 0; guard < 50 && lightStop(state) === null; guard++) {
      state = play(state, { type: 'stepLight' });
    }
    const stop = lightStop(state);
    expect(stop).toMatchObject({ kind: 'fog' });
    expect(lightLabel(state)).toBe('hud.light.fog');
    if (stop?.kind !== 'fog') return;
    expect(lightStop(play(state, { type: 'inspect', vertex: stop.vertex }))).not.toEqual(stop);
  });

  it('a stop is told when it is reached, not again while it lasts', () => {
    let state = foldingLightLevel().start;
    for (let i = 0; i < 2; i++) state = play(state, { type: 'stepLight' });
    const stopped = play(state, { type: 'stepLight' });
    expect(stopReached(state, stopped)).toEqual({ kind: 'flower', from: 2, to: 4 });
    expect(stopReached(stopped, stopped)).toBeNull();
    expect(stopReached(state, state)).toBeNull();
  });

  // Every garden each light level lets the player reach without folding (an exhaustive walk, in
  // the clear; with folds too the walk outgrows the machine's memory), and every garden of the
  // light advanced alone through the level, fog and folds included: the button is off exactly
  // where pressing it would be refused, and its words say why.
  describe.each(lightLevels().map((level) => [level.data.id, level] as const))(
    '%s: the button is off exactly where the light cannot move on',
    (_, level) => {
      it('in every garden the player can reach without folding', () => {
        let gardens = 0;
        explore(level.start, {
          without: ['foldAt'],
          goal: (state) => {
            gardens++;
            expectButtonTrue(state);
            return false;
          },
        });
        expect(gardens).toBeGreaterThan(1);
      }, 30_000);

      it('in every garden of the light advanced alone, folding and lighting as it stops', () => {
        const stops = lightAlone(level, expectButtonTrue);
        expect(stops).toContain('flower');
        expect(stops.at(-1)).toMatch(/found|done/);
      });
    },
  );
});
