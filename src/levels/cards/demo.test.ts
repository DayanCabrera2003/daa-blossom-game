import { isExposed } from '@core/matching/queries';
import { itemAt } from '@core/shared/itemAt';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { buildDemo, type CardDemo } from './demo';
import { cardsSchema, type CardData } from './schema';

/** A card written as in the file, defaults filled in by the schema. */
const card = (written: Record<string, unknown>): CardData =>
  itemAt(cardsSchema.parse([{ id: 'lanterns', ...written }]), 0);

const path3 = {
  sprouts: [
    { label: 'a', x: 20, y: 27 },
    { label: 'b', x: 60, y: 27 },
    { label: 'c', x: 100, y: 27 },
  ],
  vines: [
    ['a', 'b'],
    ['b', 'c'],
  ],
};

const built = (written: Record<string, unknown>): CardDemo => unwrap(buildDemo(card(written)));
const lit = (demo: CardDemo, frame: number, vertex: number): boolean =>
  !isExposed(itemAt(demo.frames, frame).state.matching, vertex);

describe('the demo of a mechanic card', () => {
  it('shows each move being made, then its result: one frame per step and a last one', () => {
    const demo = built({ ...path3, steps: [{ type: 'join', u: 'a', v: 'b' }] });
    expect(demo.frames).toHaveLength(2);
    expect(itemAt(demo.frames, 0).gesture).toEqual({ kind: 'touch', sprouts: [0, 1] });
    expect(lit(demo, 0, 0)).toBe(false);
    expect(itemAt(demo.frames, 1).gesture).toEqual({ kind: 'none' });
    expect(lit(demo, 1, 0)).toBe(true);
    expect(demo.names).toEqual(['a', 'b', 'c']);
    expect(demo.positions[2]).toEqual({ x: 100, y: 27 });
  });

  it('plays moves the level would not allow yet: every action is open in a demo', () => {
    const demo = built({
      ...path3,
      lanterns: [['b', 'c']],
      steps: [{ type: 'chain', path: ['a', 'b', 'c'] }],
    });
    expect(itemAt(demo.frames, 0).gesture).toEqual({ kind: 'drag', path: [0, 1, 2] });
  });

  it('a move the rules refuse is an error naming its step', () => {
    const result = buildDemo(card({ ...path3, steps: [{ type: 'join', u: 'a', v: 'c' }] }));
    expect(result).toMatchObject({ ok: false, error: { code: 'refused', step: 0 } });
  });

  it('undo goes back a state and redo forward again, pressing their buttons', () => {
    const demo = built({
      ...path3,
      steps: [{ type: 'join', u: 'a', v: 'b' }, { type: 'undo' }, { type: 'redo' }],
    });
    expect(demo.frames.map((frame) => frame.gesture.kind)).toEqual([
      'touch',
      'press',
      'press',
      'none',
    ]);
    expect(itemAt(demo.frames, 1).gesture).toEqual({ kind: 'press', button: 'undo' });
    expect([1, 2, 3].map((frame) => lit(demo, frame, 0))).toEqual([true, false, true]);
  });

  it('undo with nothing to undo, or redo with nothing undone, is an error', () => {
    expect(buildDemo(card({ ...path3, steps: [{ type: 'undo' }] }))).toMatchObject({
      ok: false,
      error: { code: 'badStep', step: 0, why: 'noUndo' },
    });
    expect(buildDemo(card({ ...path3, steps: [{ type: 'redo' }] }))).toMatchObject({
      ok: false,
      error: { code: 'badStep', step: 0, why: 'noRedo' },
    });
  });

  it('a new move after undo forgets what could have been redone', () => {
    const result = buildDemo(
      card({
        ...path3,
        steps: [
          { type: 'join', u: 'a', v: 'b' },
          { type: 'undo' },
          { type: 'join', u: 'b', v: 'c' },
          { type: 'redo' },
        ],
      }),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'badStep', step: 3, why: 'noRedo' } });
  });

  it('the sun walks the day: it stands where the day is shown, and seeking moves both', () => {
    const demo = built({
      ...path3,
      steps: [
        { type: 'join', u: 'a', v: 'b' },
        { type: 'seekSun', fraction: 0 },
      ],
    });
    expect(demo.showsSun).toBe(true);
    expect(demo.frames.map((frame) => frame.sun)).toEqual([0, 1, 0]);
    expect(itemAt(demo.frames, 1).gesture).toEqual({ kind: 'sun' });
    expect(lit(demo, 2, 0)).toBe(false);
    expect(built({ ...path3, steps: [{ type: 'join', u: 'a', v: 'b' }] }).showsSun).toBe(false);
  });

  it('a bet or an answer picks one of the choices shown, which must exist', () => {
    const choices = { count: 3, kind: 'numbers' };
    const demo = built({ ...path3, choices, steps: [{ type: 'bet', value: 1 }] });
    expect(itemAt(demo.frames, 0).gesture).toEqual({ kind: 'pick', option: 1 });
    expect(demo.choices).toEqual(choices);
    const answered = built({ ...path3, choices, steps: [{ type: 'answer', option: 2 }] });
    expect(itemAt(answered.frames, 0).gesture).toEqual({ kind: 'pick', option: 2 });
    expect(buildDemo(card({ ...path3, steps: [{ type: 'bet', value: 1 }] }))).toMatchObject({
      ok: false,
      error: { code: 'badStep', why: 'noChoices' },
    });
    expect(
      buildDemo(card({ ...path3, choices, steps: [{ type: 'answer', option: 3 }] })),
    ).toMatchObject({ ok: false, error: { code: 'badStep', why: 'choiceOutOfRange' } });
  });

  it('touches on a sprout, a vine or the garden are shown, and change no lantern', () => {
    const demo = built({
      ...path3,
      steps: [
        { type: 'tapSprout', vertex: 'b' },
        { type: 'pickVine', u: 'c', v: 'b' },
        { type: 'tapGarden' },
      ],
    });
    expect(demo.frames.map((frame) => frame.gesture)).toEqual([
      { kind: 'touch', sprouts: [1] },
      { kind: 'vines', vines: [[2, 1]] },
      { kind: 'tapGarden' },
      { kind: 'none' },
    ]);
  });

  it('a reflection shows its silver lanterns; a drawn one shows from the frame after it', () => {
    const shown = built({ ...path3, mirror: [['a', 'b']], steps: [{ type: 'tapGarden' }] });
    expect(itemAt(shown.frames, 0).silver).toEqual([[0, 1]]);
    const drawn = built({
      ...path3,
      steps: [{ type: 'drawMirror', lanterns: [['b', 'c']] }, { type: 'checkMirror' }],
    });
    expect(drawn.frames.map((frame) => frame.silver)).toEqual([[], [[1, 2]], [[1, 2]]]);
    expect(itemAt(drawn.frames, 0).gesture).toEqual({ kind: 'vines', vines: [[1, 2]] });
    expect(itemAt(drawn.frames, 1).gesture).toEqual({ kind: 'press', button: 'check' });
  });

  it('a second drawing touches only the vines it adds', () => {
    const drawn = built({
      sprouts: [...path3.sprouts, { label: 'd', x: 100, y: 40 }],
      vines: [...path3.vines, ['c', 'd']],
      steps: [
        { type: 'drawMirror', lanterns: [['a', 'b']] },
        {
          type: 'drawMirror',
          lanterns: [
            ['a', 'b'],
            ['c', 'd'],
          ],
        },
      ],
    });
    expect(itemAt(drawn.frames, 1).gesture).toEqual({ kind: 'vines', vines: [[2, 3]] });
  });

  it('a chain drawn in the flower challenge is dragged and changes no lantern', () => {
    const demo = built({ ...path3, steps: [{ type: 'drawChain', path: ['a', 'b'] }] });
    expect(itemAt(demo.frames, 0).gesture).toEqual({ kind: 'drag', path: [0, 1] });
    expect(lit(demo, 1, 0)).toBe(false);
    const lantern = { ...path3, lanterns: [['b', 'c']] };
    expect(
      buildDemo(card({ ...lantern, steps: [{ type: 'drawChain', path: ['a', 'b'] }] })),
    ).toMatchObject({
      ok: false,
      error: { code: 'badStep', why: 'badChain' },
    });
  });

  it('silver lanterns that are not a valid set of lanterns are an error', () => {
    const drawing = card({
      ...path3,
      steps: [
        {
          type: 'drawMirror',
          lanterns: [
            ['a', 'b'],
            ['b', 'c'],
          ],
        },
      ],
    });
    expect(buildDemo(drawing)).toMatchObject({
      ok: false,
      error: { code: 'badStep', why: 'badDrawn' },
    });
    const reflected = card({
      ...path3,
      mirror: [
        ['a', 'b'],
        ['b', 'c'],
      ],
      steps: [{ type: 'tapGarden' }],
    });
    expect(buildDemo(reflected)).toMatchObject({ ok: false, error: { code: 'badMirror' } });
  });

  it('unknown names are errors, in the garden, the reflection or a step', () => {
    expect(
      buildDemo(card({ ...path3, vines: [['a', 'z']], steps: [{ type: 'tapGarden' }] })),
    ).toMatchObject({ ok: false, error: { code: 'badLabel' } });
    expect(
      buildDemo(card({ ...path3, mirror: [['a', 'z']], steps: [{ type: 'tapGarden' }] })),
    ).toMatchObject({ ok: false, error: { code: 'badLabel' } });
    expect(
      buildDemo(card({ ...path3, steps: [{ type: 'tapSprout', vertex: 'z' }] })),
    ).toMatchObject({ ok: false, error: { code: 'badLabel', step: 0 } });
  });

  it('each kind of move shows the gesture that makes it: a lit vine or a meeting is touched on the vine', () => {
    const triangle = {
      sprouts: [
        { label: 'a', x: 30, y: 40 },
        { label: 'b', x: 60, y: 12 },
        { label: 'c', x: 90, y: 40 },
      ],
      vines: [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
      ],
      lanterns: [['b', 'c']],
    };
    const folded = built({
      ...triangle,
      steps: [
        { type: 'fold', loop: ['a', 'b', 'c'] },
        { type: 'unfold', blossom: 0 },
        { type: 'markRoot', vertex: 'a' },
        { type: 'markMoon', from: 'a', to: 'b' },
        { type: 'foldAt', from: 'c', to: 'a' },
        { type: 'declareDone' },
      ],
    });
    expect(folded.frames.map((frame) => frame.gesture)).toEqual([
      { kind: 'loop', sprouts: [0, 1, 2] },
      { kind: 'touch', sprouts: [0, 1, 2] },
      { kind: 'touch', sprouts: [0] },
      { kind: 'touch', sprouts: [0, 1] },
      { kind: 'vines', vines: [[2, 0]] },
      { kind: 'press', button: 'done' },
      { kind: 'none' },
    ]);
    const placed = built({
      ...path3,
      lanterns: [['b', 'c']],
      steps: [
        { type: 'passLantern', from: 'a', to: 'b' },
        { type: 'split', u: 'a', v: 'b' },
        { type: 'placeScarecrow', vertex: 'b' },
        { type: 'removeScarecrow', vertex: 'b' },
        { type: 'liftStone', vertex: 'c' },
        { type: 'dropStone', vertex: 'c' },
      ],
    });
    expect(placed.frames.map((frame) => frame.gesture).slice(0, 6)).toEqual([
      { kind: 'touch', sprouts: [0, 1] },
      { kind: 'vines', vines: [[0, 1]] },
      { kind: 'touch', sprouts: [1] },
      { kind: 'touch', sprouts: [1] },
      { kind: 'touch', sprouts: [2] },
      { kind: 'touch', sprouts: [2] },
    ]);
  });

  it('inspecting under fog and turning a stem show where the touch goes', () => {
    const fogged = built({ ...path3, fog: true, steps: [{ type: 'inspect', vertex: 'b' }] });
    expect(itemAt(fogged.frames, 0).gesture).toEqual({ kind: 'touch', sprouts: [1] });
    expect(itemAt(fogged.frames, 0).state.revealed).toEqual([false, false, false]);
    const stem = built({
      sprouts: [
        { label: 'R', x: 10, y: 27 },
        { label: 'a', x: 35, y: 27 },
        { label: 'b', x: 60, y: 27 },
        { label: 'c', x: 95, y: 12 },
        { label: 'd', x: 95, y: 42 },
      ],
      vines: [
        ['R', 'a'],
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['d', 'b'],
      ],
      lanterns: [
        ['a', 'b'],
        ['c', 'd'],
      ],
      steps: [{ type: 'rotateStem', stem: ['R', 'a', 'b'] }],
    });
    expect(itemAt(stem.frames, 0).gesture).toEqual({ kind: 'drag', path: [0, 1, 2] });
  });
});
