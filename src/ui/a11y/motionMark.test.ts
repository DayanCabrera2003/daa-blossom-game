import { createBus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { describe, expect, it } from 'vitest';
import { mountMotionMark, type SystemMotion } from './motionMark';

/** The system's "reduce motion" query, which the test turns on and off. */
function fakeSystem(matches: boolean): SystemMotion & { flip(): void } {
  const listeners: (() => void)[] = [];
  const system = {
    matches,
    addEventListener: (_: 'change', listener: () => void) => void listeners.push(listener),
    flip: () => {
      system.matches = !system.matches;
      for (const listener of listeners) listener();
    },
  };
  return system;
}

describe('the mark of the motion on the page, for the books and the epilogue', () => {
  it('starts as the setting and the system say', () => {
    const root = { dataset: {} as Record<string, string | undefined> };
    mountMotionMark({
      bus: createBus<BusEvents>(),
      root,
      choice: 'system',
      system: fakeSystem(true),
    });
    expect(root.dataset.motion).toBe('reduced');
  });

  it('follows the settings panel, and the system while the setting follows it', () => {
    const bus = createBus<BusEvents>();
    const root = { dataset: {} as Record<string, string | undefined> };
    const system = fakeSystem(false);
    mountMotionMark({ bus, root, choice: 'system', system });
    expect(root.dataset.motion).toBe('full');
    system.flip();
    expect(root.dataset.motion).toBe('reduced');
    bus.emit('motion.changed', { motion: 'full' });
    expect(root.dataset.motion).toBe('full');
    system.flip();
    system.flip();
    expect(root.dataset.motion).toBe('full');
    bus.emit('motion.changed', { motion: 'reduced' });
    expect(root.dataset.motion).toBe('reduced');
  });

  it('works where the browser cannot tell when the system changes its mind', () => {
    const root = { dataset: {} as Record<string, string | undefined> };
    mountMotionMark({
      bus: createBus<BusEvents>(),
      root,
      choice: 'full',
      system: { matches: true },
    });
    expect(root.dataset.motion).toBe('full');
  });
});
