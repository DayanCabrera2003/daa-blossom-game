import { describe, expect, it } from 'vitest';
import { createOperationCounter } from './operationCounter';

describe('operation counter', () => {
  it('starts at zero for every kind of work', () => {
    const counter = createOperationCounter();
    expect(counter.counts).toEqual({ scan: 0, label: 0, rebase: 0, flip: 0 });
    expect(counter.total).toBe(0);
  });

  it('adds up each kind separately and in total', () => {
    const counter = createOperationCounter();
    counter.count('scan');
    counter.count('scan');
    counter.count('rebase', 5);
    expect(counter.counts).toEqual({ scan: 2, label: 0, rebase: 5, flip: 0 });
    expect(counter.total).toBe(7);
  });

  it('hands out a snapshot of the counts', () => {
    const counter = createOperationCounter();
    const before = counter.counts;
    counter.count('label');
    expect(before.label).toBe(0);
  });

  it('rejects negative or fractional amounts', () => {
    const counter = createOperationCounter();
    expect(() => counter.count('flip', -1)).toThrow();
    expect(() => counter.count('flip', 0.5)).toThrow();
  });
});
