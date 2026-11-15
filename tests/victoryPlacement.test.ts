import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { invariant } from '../src/core/shared/invariant';
import { CHAR_ADVANCE, estimatedButtonWidth } from '../src/game/picture/bottomRows';
import type { Rect } from '../src/game/picture/boxDistance';
import { totalCoverage } from '../src/game/picture/coverage';
import { panelAvoidance } from '../src/game/picture/panelAvoidance';
import { choosePanel } from '../src/game/picture/panelPlacement';
import { victorySpots } from '../src/game/picture/panelSpots';
import { STAR_SIZE } from '../src/game/picture/starIcon';
import { STAR_KINDS } from '../src/game/picture/starRows';
import { VICTORY, victoryLayout } from '../src/game/picture/victoryLayout';
import { playWalkthrough } from '../src/game/systems/walkthrough';
import type { Level } from '../src/levels/build';
import { catalog } from '../src/levels/catalog';
import { starsCeiling } from '../src/levels/starsCeiling';
import { createTranslator } from '../src/services/i18n';
import { LAYOUT_PROPERTY_TIMEOUT } from './support/timeouts';

// The victory panel opens over the garden just won where it hides none of it, whenever some spot
// between the bars of the 480 × 270 canvas allows it, and never hides more of it than the middle of
// the canvas, where it always fell. It is measured as the view measures it, with a row for each
// star the level can give and both buttons.

const t = createTranslator(strings);
const levels = catalog();

/** The widest star row's words, and the buttons: the way back and the next garden. */
const starsWidth = Math.max(
  ...STAR_KINDS.map(
    (star) => STAR_SIZE + VICTORY.starGap + [...t(`victory.star.${star}`)].length * CHAR_ADVANCE,
  ),
);
const buttons = [t('victory.hub'), t('victory.next')].map(estimatedButtonWidth);

/** The victory panel of `level`, in the middle of the canvas. */
function panelOf(level: Level): Rect {
  const rows = starsCeiling(level.data);
  const { x, y, width, height } = victoryLayout(buttons, { width: starsWidth, rows });
  return { x, y, width, height };
}

describe('the victory panel over every garden won', () => {
  it.each(levels.map((level) => [level.data.id, level] as const))(
    'over %s it hides none of the garden if it can, and never more than in the middle',
    (_, level) => {
      const { controller } = playWalkthrough(level);
      invariant(controller.session.won !== null, 'the walkthrough wins its level');
      const home = panelOf(level);
      const spots = victorySpots(home);
      const avoid = panelAvoidance(controller);
      const chosen = totalCoverage(choosePanel(spots, avoid), avoid.shapes);
      const least = Math.min(...spots.map((spot) => totalCoverage(spot, avoid.shapes)));
      expect(chosen).toBeLessThanOrEqual(least + 0.5);
      expect(chosen).toBeLessThanOrEqual(totalCoverage(home, avoid.shapes) + 0.5);
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it('in 0.1 it no longer falls on the lantern just lit', () => {
    const level = levels.find((candidate) => candidate.data.id === '0.1');
    invariant(level !== undefined, 'level 0.1 exists');
    const avoid = panelAvoidance(playWalkthrough(level).controller);
    const home = panelOf(level);
    expect(totalCoverage(home, avoid.shapes)).toBeGreaterThan(0);
    expect(totalCoverage(choosePanel(victorySpots(home), avoid), avoid.shapes)).toBe(0);
  });
});
