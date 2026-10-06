import { describe, expect, it } from 'vitest';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { createGardenState } from './state';
import { isVictory } from './victory';

// Level 3.7, part I: 1–2–3–4–5 as 0..4, with its maximum of two lanterns.
const path = pathGraph(5);
const twoLit = createGardenState({
  graph: path,
  matching: unwrap(
    createMatching(path, [
      [0, 1],
      [2, 3],
    ]),
  ),
  allowed: [],
});

describe('victory conditions', () => {
  it('matchingSize: enough lanterns are lit', () => {
    expect(isVictory(twoLit, { type: 'matchingSize', value: 2 })).toBe(true);
    expect(isVictory(twoLit, { type: 'matchingSize', value: 3 })).toBe(false);
  });

  it('maximum: "Terminé" wins only when it is true, judged by Edmonds', () => {
    expect(isVictory(twoLit, { type: 'maximum' })).toBe(false);
    expect(isVictory({ ...twoLit, declaredDone: true }, { type: 'maximum' })).toBe(true);
    const oneLit = createGardenState({
      graph: path,
      matching: unwrap(createMatching(path, [[1, 2]])),
      allowed: [],
    });
    expect(isVictory({ ...oneLit, declaredDone: true }, { type: 'maximum' })).toBe(false);
  });

  it('chainFound: the marks reached a chain (level 4.4)', () => {
    expect(isVictory(twoLit, { type: 'chainFound' })).toBe(false);
    expect(isVictory({ ...twoLit, chainSeen: [4, 3] }, { type: 'chainFound' })).toBe(true);
  });

  it('coverCertificate: scarecrows guard every vine, exactly as many as lanterns (3.7)', () => {
    const certify = (scarecrows: number[]) =>
      isVictory({ ...twoLit, scarecrows }, { type: 'coverCertificate' });
    expect(certify([1, 3])).toBe(true);
    expect(certify([1])).toBe(false);
    expect(certify([0, 1, 3])).toBe(false);
  });

  it('tutteBergeCertificate: the stones prove the lanterns (the helix, 7.3)', () => {
    const helix = unwrap(
      createGraph(10, [
        [0, 1],
        [0, 4],
        [0, 7],
        [1, 2],
        [2, 3],
        [1, 3],
        [4, 5],
        [5, 6],
        [4, 6],
        [7, 8],
        [8, 9],
        [7, 9],
      ]),
    );
    const garden = createGardenState({
      graph: helix,
      matching: unwrap(
        createMatching(helix, [
          [0, 1],
          [2, 3],
          [4, 5],
          [7, 8],
        ]),
      ),
      allowed: [],
    });
    expect(isVictory({ ...garden, stones: [0] }, { type: 'tutteBergeCertificate' })).toBe(true);
    expect(isVictory(garden, { type: 'tutteBergeCertificate' })).toBe(false);
  });
});
