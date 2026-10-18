import { describe, expect, it } from 'vitest';
import { createBus } from './bus';

/** A small event map for the tests: one event with a payload, one without. */
interface TestEvents {
  readonly ping: number;
  readonly done: undefined;
}

describe('typed event bus', () => {
  it('delivers each event to every listener, in the order they subscribed', () => {
    const bus = createBus<TestEvents>();
    const heard: string[] = [];
    bus.on('ping', (n) => heard.push(`first ${n}`));
    bus.on('ping', (n) => heard.push(`second ${n}`));
    bus.emit('ping', 7);
    expect(heard).toEqual(['first 7', 'second 7']);
  });

  it('only delivers an event to the listeners of its own type', () => {
    const bus = createBus<TestEvents>();
    const heard: string[] = [];
    bus.on('done', () => heard.push('done'));
    bus.emit('ping', 1);
    expect(heard).toEqual([]);
    bus.emit('done');
    expect(heard).toEqual(['done']);
  });

  it('off removes a listener, and so does the function on returns', () => {
    const bus = createBus<TestEvents>();
    const heard: number[] = [];
    const listener = (n: number): void => void heard.push(n);
    bus.on('ping', listener);
    bus.emit('ping', 1);
    bus.off('ping', listener);
    bus.emit('ping', 2);
    const unsubscribe = bus.on('ping', listener);
    bus.emit('ping', 3);
    unsubscribe();
    bus.emit('ping', 4);
    expect(heard).toEqual([1, 3]);
  });

  it('removing a listener that never subscribed changes nothing', () => {
    const bus = createBus<TestEvents>();
    const heard: number[] = [];
    bus.on('ping', (n) => heard.push(n));
    bus.off('ping', () => undefined);
    bus.off('done', () => undefined);
    bus.emit('ping', 5);
    expect(heard).toEqual([5]);
  });

  it('a listener that throws is reported and the others still hear the event', () => {
    const reported: unknown[] = [];
    const bus = createBus<TestEvents>((error) => reported.push(error));
    const heard: number[] = [];
    const failure = new Error('broken listener');
    bus.on('ping', () => {
      throw failure;
    });
    bus.on('ping', (n) => heard.push(n));
    bus.emit('ping', 9);
    expect(heard).toEqual([9]);
    expect(reported).toEqual([failure]);
  });

  it('a listener added while an event is delivered hears only the next one', () => {
    const bus = createBus<TestEvents>();
    const heard: string[] = [];
    bus.on('ping', (n) => {
      heard.push(`outer ${n}`);
      if (n === 1) bus.on('ping', (m) => heard.push(`inner ${m}`));
    });
    bus.emit('ping', 1);
    bus.emit('ping', 2);
    expect(heard).toEqual(['outer 1', 'outer 2', 'inner 2']);
  });

  it('reports to the console when no reporter is given', () => {
    const bus = createBus<TestEvents>();
    const original = console.error;
    const logged: unknown[] = [];
    console.error = (...args: unknown[]) => void logged.push(...args);
    try {
      bus.on('done', () => {
        throw new Error('loud');
      });
      bus.emit('done');
    } finally {
      console.error = original;
    }
    expect(logged).toHaveLength(1);
  });
});
