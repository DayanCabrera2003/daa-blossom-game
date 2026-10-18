import notation from '@content/es/notation.json';
import { edmonds } from '@core/edmonds/solve';
import { applyAction } from '@core/rules/applyAction';
import type { TraceEvent } from '@core/trace/events';
import { catalog } from '@levels/catalog';
import { gardenAtPlay } from '@levels/playStart';
import { renderMath } from '@ui/math/renderMath';
import { NOTATION_KEYS } from '@ui/model/notationKeys';
import { teacherTrace } from '@ui/model/teacherTrace';
import { fillNotation, traceLines } from '@ui/model/traceNotation';
import { texName } from '@ui/model/texName';
import { describe, expect, it } from 'vitest';

/**
 * The teacher's notation renders (plan 07, phase 12): on every level of the catalog, the whole run
 * of Edmonds from its starting lanterns with the certificate that closes it, and the day of its
 * reference solution, written line by line, are valid TeX for KaTeX in its strict mode; so is every template with any gap, and any
 * name a sprout may carry.
 */

/** Renders `tex` as the panel does, but throwing on anything KaTeX or LaTeX would reject. */
const renders = (tex: string): void => {
  expect(() => renderMath(tex, false, 'strict'), tex).not.toThrow();
};

describe('the notation of the teacher renders with KaTeX', () => {
  it('every template, its gaps filled with names', () => {
    for (const [key, gaps] of Object.entries(NOTATION_KEYS)) {
      renders(fillNotation(notation, key, Object.fromEntries(gaps.map((gap) => [gap, 'a_{1}']))));
    }
  });

  it('names with the characters TeX gives a meaning, or letters beyond ASCII', () => {
    for (const name of [
      'x_y',
      '#1',
      'a\\b',
      '{c}',
      'd^e',
      '50%',
      'f&g',
      '$h',
      'i~j',
      'ñu',
      'Ana',
    ]) {
      renders(`${texName(name)}\\in O`);
    }
  });

  for (const level of catalog()) {
    const names = level.data.sprouts.map((sprout) => sprout.label);
    it(`level ${level.data.id}: the run of Edmonds, its certificate and the reference day`, () => {
      const run = edmonds(level.graph, level.start.matching);
      for (const line of traceLines(run.trace, names, notation)) renders(line.tex);
      const feed = { level: level.data.id, day: [level.start], events: [[]], cursor: 0 };
      for (const line of teacherTrace(feed, names, notation).certificate) renders(line);
      let state = gardenAtPlay(level);
      const day: TraceEvent[] = [];
      for (const move of level.solution) {
        const outcome = applyAction(state, move);
        if (!outcome.ok) break;
        day.push(...outcome.events);
        state = outcome.state;
      }
      for (const line of traceLines(day, names, notation)) renders(line.tex);
    });
  }
});
