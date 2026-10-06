import { describe, expect, it } from 'vitest';
import { createRecorder } from './recorder';

describe('trace recorder', () => {
  it('starts empty', () => {
    const recorder = createRecorder();
    expect(recorder.events).toEqual([]);
    expect(recorder.steps).toBe(0);
  });

  it('keeps events in order and counts one step per event', () => {
    const recorder = createRecorder();
    recorder.record({ type: 'searchStart', roots: [0] });
    recorder.record({ type: 'labelOuter', vertex: 0, parent: null, root: 0 });
    recorder.record({ type: 'scanEdge', from: 0, to: 1 });
    expect(recorder.events.map((event) => event.type)).toEqual([
      'searchStart',
      'labelOuter',
      'scanEdge',
    ]);
    expect(recorder.steps).toBe(3);
  });

  it('hands out a snapshot that later records do not change', () => {
    const recorder = createRecorder();
    recorder.record({ type: 'searchFailed' });
    const snapshot = recorder.events;
    recorder.record({ type: 'done', size: 0 });
    expect(snapshot).toHaveLength(1);
    expect(recorder.events).toHaveLength(2);
  });
});
