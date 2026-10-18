import { describe, expect, it } from 'vitest';
import { onceAFrame } from './onceAFrame';

/** A frame clock the test advances by hand. */
function frames() {
  let waiting: (() => void)[] = [];
  return {
    request: (callback: () => void): void => {
      waiting.push(callback);
    },
    next: (): void => {
      const due = waiting;
      waiting = [];
      due.forEach((callback) => callback());
    },
    pending: (): number => waiting.length,
  };
}

describe('a change of the window laid out once, on the next frame', () => {
  it('runs nothing until the next frame', () => {
    const clock = frames();
    let runs = 0;
    const trigger = onceAFrame(clock.request, () => (runs += 1));
    trigger();
    expect(runs).toBe(0);
    clock.next();
    expect(runs).toBe(1);
  });

  it('several changes in one frame (resize, orientationchange, the visual viewport) run once', () => {
    const clock = frames();
    let runs = 0;
    const trigger = onceAFrame(clock.request, () => (runs += 1));
    trigger();
    trigger();
    trigger();
    expect(clock.pending()).toBe(1);
    clock.next();
    expect(runs).toBe(1);
  });

  it('a change after the frame ran asks for another frame', () => {
    const clock = frames();
    let runs = 0;
    const trigger = onceAFrame(clock.request, () => (runs += 1));
    trigger();
    clock.next();
    trigger();
    clock.next();
    expect(runs).toBe(2);
  });
});
