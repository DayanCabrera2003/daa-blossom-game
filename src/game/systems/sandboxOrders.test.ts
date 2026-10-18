import { actionsUnlockedBy, UNLOCKED_AT } from '@core/rules/permissions';
import type { ActionType } from '@core/rules/actions';
import { unwrap } from '@core/shared/result';
import type { Design } from '@levels/sandbox/design';
import { generate } from '@levels/sandbox/generators';
import { toPlayable } from '@levels/sandbox/toLevel';
import type { SandboxAccess } from '@services/sandboxAccess';
import { describe, expect, it } from 'vitest';
import type { FreeOrders, OrderAnswer } from './levelController';
import { garden, openSession, type LevelSession } from './levelSession';
import { GARDENER_REPLAY_MS, freeOrders } from './sandboxOrders';

/** Every action of the game. */
const ALL = Object.keys(UNLOCKED_AT) as ActionType[];

/** What the free mode offers in teacher mode: everything. */
const TEACHER: SandboxAccess = {
  exists: true,
  actions: ALL,
  gardener: true,
  scarecrows: true,
  stones: true,
  interfaceAt: '8.1',
};

/** What it offers a player whose furthest level won is `at`. */
const playerAt = (at: string, orders: Partial<SandboxAccess>): SandboxAccess => ({
  exists: true,
  actions: actionsUnlockedBy(at),
  gardener: false,
  scarecrows: false,
  stones: false,
  interfaceAt: at,
  ...orders,
});

/** A triangle A–B–C with a tail C–D, one lantern on A–B. */
const TRIANGLE: Design = {
  sprouts: [
    { label: 'A', x: 120, y: 100 },
    { label: 'B', x: 200, y: 100 },
    { label: 'C', x: 160, y: 160 },
    { label: 'D', x: 240, y: 180 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'A'],
    ['C', 'D'],
  ],
  lanterns: [['A', 'B']],
};

/** A session of `design` for the player `access` describes. */
const sessionOf = (design: Design, access: SandboxAccess): LevelSession =>
  openSession(unwrap(toPlayable(design, access.actions)), 0).session;

/** Runs an order the player has. */
const run = (
  orders: FreeOrders,
  kind: 'solve' | 'certify',
  session: LevelSession,
): OrderAnswer | null => {
  const order = orders[kind];
  if (order === null) throw new Error(`no ${kind} order`);
  return order(session);
};

/** The session an order done leaves. */
const after = (answer: OrderAnswer | null): LevelSession => {
  if (answer?.kind !== 'done') throw new Error('the order was not done');
  return answer.session;
};

describe("the free mode's orders, as the player has met them", () => {
  it('none before the gardener (6.2) and the scarecrows (3.8)', () => {
    expect(freeOrders(playerAt('2.4', {}))).toEqual({ solve: null, certify: null });
  });

  it('the certificate alone from 3.8, the gardener as well from 6.2, everything for the teacher', () => {
    const at38 = freeOrders(playerAt('3.8', { scarecrows: true }));
    expect(at38.solve).toBeNull();
    expect(at38.certify).not.toBeNull();
    const at62 = freeOrders(playerAt('6.2', { scarecrows: true, gardener: true }));
    expect(at62.solve).not.toBeNull();
    expect(freeOrders(TEACHER).solve).not.toBeNull();
    expect(freeOrders(TEACHER).certify).not.toBeNull();
  });
});

describe('the mechanical gardener, ordered', () => {
  it('plays his day within its time, then the mentor says how many lanterns and points at the sun', () => {
    const answer = run(freeOrders(TEACHER), 'solve', sessionOf(TRIANGLE, TEACHER));
    expect(answer?.kind).toBe('done');
    if (answer?.kind !== 'done') return;
    expect(answer.within).toBe(GARDENER_REPLAY_MS);
    expect(answer.day[answer.day.length - 1]).toBe(garden(answer.session));
    expect(answer.lines).toEqual([
      { key: 'sandbox.solve.done', params: { count: 2 }, speaker: 'sauce' },
    ]);
  });
});

describe('the certificate, ordered', () => {
  it('not yet: the way to a finished search, with the gardener when he is met', () => {
    expect(run(freeOrders(TEACHER), 'certify', sessionOf(TRIANGLE, TEACHER))).toEqual({
      kind: 'refused',
      toast: { key: 'sandbox.certify.notYetGardener', params: {} },
    });
    // A row of bees and flowers, before the gardener is met.
    const access = playerAt('4.5', { scarecrows: true });
    const { design } = generate('path', 4, 0);
    expect(run(freeOrders(access), 'certify', sessionOf(design, access))).toEqual({
      kind: 'refused',
      toast: { key: 'sandbox.certify.notYet', params: {} },
    });
  });

  it('scarecrows alone in a garden with an odd loop: they prove only bees and flowers', () => {
    const access = playerAt('6.2', { scarecrows: true, gardener: true });
    const orders = freeOrders(access);
    const solved = after(run(orders, 'solve', sessionOf(TRIANGLE, access)));
    expect(run(orders, 'certify', solved)).toEqual({
      kind: 'refused',
      toast: { key: 'sandbox.certify.notBees', params: {} },
    });
  });

  it("the Council tells the count of the stones on the moons, in the Council's voice", () => {
    const orders = freeOrders(TEACHER);
    const solved = after(run(orders, 'solve', sessionOf(TRIANGLE, TEACHER)));
    const answer = run(orders, 'certify', solved);
    expect(answer?.kind).toBe('done');
    if (answer?.kind !== 'done') return;
    expect(answer.within).toBeNull();
    // Four sprouts, two lanterns: no one in the dark, so no stone is needed.
    expect(answer.lines).toEqual([
      { key: 'sandbox.certify.stonesFull', params: {}, speaker: 'oaks' },
    ]);
  });

  it('with sprouts in the dark, the stones and the groups they leave', () => {
    // A loop of three alone: one lantern, one sprout in the dark.
    const loop: Design = {
      sprouts: TRIANGLE.sprouts.slice(0, 3),
      vines: TRIANGLE.vines.slice(0, 3),
      lanterns: [['A', 'B']],
    };
    const orders = freeOrders(TEACHER);
    const solved = after(run(orders, 'solve', sessionOf(loop, TEACHER)));
    const answer = run(orders, 'certify', solved);
    expect(answer?.kind === 'done' ? answer.lines : null).toEqual([
      { key: 'sandbox.certify.stones', params: { groups: 1, stones: 0, dark: 1 }, speaker: 'oaks' },
    ]);
  });

  it('among bees and flowers, the mentor tells the scarecrows as well', () => {
    const { design } = generate('beesFlowers', 8, 3);
    const orders = freeOrders(TEACHER);
    const solved = after(run(orders, 'solve', sessionOf(design, TEACHER)));
    const answer = run(orders, 'certify', solved);
    if (answer?.kind !== 'done') throw new Error('no certificate');
    const lanterns = garden(answer.session).scarecrows.length;
    expect(answer.lines.map((line) => line.key)).toContain('sandbox.certify.scarecrows');
    expect(answer.lines.at(-1)).toEqual({
      key: 'sandbox.certify.scarecrows',
      params: { count: lanterns },
      speaker: 'sauce',
    });
  });
});
