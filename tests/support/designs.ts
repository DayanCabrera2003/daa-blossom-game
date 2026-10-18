import fc from 'fast-check';
import {
  EMPTY_DESIGN,
  editDesign,
  type Design,
  type DesignEdit,
} from '../../src/levels/sandbox/design';
import { SPROUT_AREA } from '../../src/levels/fields';
import { LETTERS } from '../../src/levels/sandbox/names';

// Arbitrary edits and designs of the free mode (plan 08, phase 8), for its property tests.

/** An edit of any kind, on any letter and anywhere on the canvas, inside the garden or not. */
export const anyEdit: fc.Arbitrary<DesignEdit> = (() => {
  const letter = fc.constantFrom(...LETTERS);
  const x = fc.integer({ min: 0, max: 480 });
  const y = fc.integer({ min: 0, max: 270 });
  return fc.oneof(
    { arbitrary: fc.record({ type: fc.constant('addSprout' as const), x, y }), weight: 6 },
    {
      arbitrary: fc.record({ type: fc.constant('moveSprout' as const), label: letter, x, y }),
      weight: 2,
    },
    {
      arbitrary: fc.record({ type: fc.constant('removeSprout' as const), label: letter }),
      weight: 1,
    },
    {
      arbitrary: fc.record({ type: fc.constant('toggleVine' as const), u: letter, v: letter }),
      weight: 8,
    },
    {
      arbitrary: fc.record({ type: fc.constant('toggleLantern' as const), u: letter, v: letter }),
      weight: 4,
    },
  );
})();

/** Applies the edits in turn, skipping those the reducer refuses. */
export const applyEdits = (edits: readonly DesignEdit[], from: Design = EMPTY_DESIGN): Design =>
  edits.reduce((design, edit) => {
    const outcome = editDesign(design, edit);
    return outcome.ok ? outcome.value : design;
  }, from);

/**
 * A design of at least one and at most `maxSprouts` sprouts, grown with the editor's own edits:
 * sprouts inside the garden, then vines and lanterns among them.
 */
export const designArb = ({ maxSprouts = 24 } = {}): fc.Arbitrary<Design> => {
  const letter = fc.constantFrom(...LETTERS.slice(0, maxSprouts));
  const spot = fc.record({
    x: fc.integer({ min: SPROUT_AREA.x0, max: SPROUT_AREA.x1 }),
    y: fc.integer({ min: SPROUT_AREA.y0, max: SPROUT_AREA.y1 }),
  });
  return fc
    .tuple(
      fc.array(spot, { minLength: 1, maxLength: maxSprouts }),
      fc.array(fc.tuple(letter, letter), { maxLength: 60 }),
      fc.array(fc.tuple(letter, letter), { maxLength: 12 }),
    )
    .map(([spots, vines, lanterns]) =>
      applyEdits([
        ...spots.map((at): DesignEdit => ({ type: 'addSprout', ...at })),
        ...vines.map(([u, v]): DesignEdit => ({ type: 'toggleVine', u, v })),
        ...lanterns.map(([u, v]): DesignEdit => ({ type: 'toggleLantern', u, v })),
      ]),
    );
};
