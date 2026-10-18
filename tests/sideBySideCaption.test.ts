import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { centroid } from '../src/game/input/flowerShape';
import { FLOWER_REACH } from '../src/game/picture/petals';
import { CAPTION, captionBox } from '../src/game/picture/sideBySideCaption';
import { CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { catalog } from '../src/levels/catalog';
import { SIDE_BY_SIDE } from '../src/levels/fields';
import { labelBox } from '../src/levels/layoutChecks';
import { PICTURE_SIZES } from '../src/levels/pictureSizes';
import { boxesNear, boxNearCircle, type Box } from '../src/levels/plane';
import { boxNearSprout } from '../src/levels/sproutExtent';
import { createTranslator } from '../src/services/i18n';

// The caption of the flower challenge (GDD 4.11; plan 09, decision on phase 10) is written over
// both gardens on a dark backing: in every level that shows its garden open and folded side by
// side, no caption may cover a sprout, its leaves or its name, in the open garden or in its folded
// copy on the right.

const t = createTranslator(strings);

/** Every caption the challenge can show, one per moment of its argument. */
const CAPTIONS = ['flower.ends', 'flower.stretch', 'flower.whole', 'flower.folded', 'flower.again'];

/** The levels that show their garden side by side: those declaring a flower. */
const sideBySide = catalog().filter(
  (level) => level.data.flower !== undefined && level.data.flower !== null,
);

const { labelClearance: clearance } = PICTURE_SIZES;

describe('the caption of the flower challenge covers nothing', () => {
  it('is shown by 4.11', () => {
    expect(sideBySide.map((level) => level.data.id)).toEqual(['4.11']);
  });

  it('fits across the canvas on as few lines as its words need', () => {
    for (const key of CAPTIONS) {
      const box = captionBox(t(key));
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(box.width).toBeLessThanOrEqual(CAPTION.wrap);
    }
  });

  it.each(sideBySide.map((level) => [level.data.id, level] as const))(
    'in %s no caption covers a sprout or a name of either garden',
    (_, level) => {
      const sprouts = level.data.sprouts;
      const folded = sprouts.map((sprout) => ({ ...sprout, x: sprout.x + SIDE_BY_SIDE.shift }));
      const petals = (level.data.flower ?? []).map((label) => {
        const sprout = sprouts.find((candidate) => candidate.label === label);
        return { x: (sprout?.x ?? 0) + SIDE_BY_SIDE.shift, y: sprout?.y ?? 0 };
      });
      const flower = centroid(petals);
      for (const key of CAPTIONS) {
        const rect = captionBox(t(key));
        const box: Box = {
          left: rect.x,
          right: rect.x + rect.width,
          top: rect.y,
          bottom: rect.y + rect.height,
        };
        for (const sprout of [...sprouts, ...folded]) {
          expect(boxNearSprout(box, sprout, clearance), `${key} on ${sprout.label}`).toBe(false);
          expect(
            boxesNear(box, labelBox(sprout), clearance),
            `${key} on ${sprout.label}'s name`,
          ).toBe(false);
        }
        expect(boxNearCircle(box, flower, FLOWER_REACH, clearance), `${key} on the flower`).toBe(
          false,
        );
      }
    },
  );
});
