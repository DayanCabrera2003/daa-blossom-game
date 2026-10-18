import { describe, expect, it } from 'vitest';
import type { Shape } from './coverage';
import { choosePanel } from './panelPlacement';

const box = (x: number, y: number, width = 10, height = 10): Shape => ({
  kind: 'box',
  box: { x, y, width, height },
});

const spots = [
  { x: 0, y: 0, width: 20, height: 20 },
  { x: 100, y: 0, width: 20, height: 20 },
  { x: 200, y: 0, width: 20, height: 20 },
];

describe('where a panel opens among its spots', () => {
  it('where it always opened when it hides nothing there', () => {
    expect(choosePanel(spots, { shapes: [box(100, 0)], referred: [] })).toBe(spots[0]);
  });

  it('where it hides least of the garden', () => {
    const shapes = [box(0, 0), box(5, 5), box(100, 0)];
    expect(choosePanel(spots, { shapes, referred: [] })).toBe(spots[2]);
  });

  it('never over what the step points at while another spot keeps it in sight', () => {
    // The third spot hides more of the garden, but not the piece asked about.
    const shapes = [box(0, 0), box(200, 0, 20, 20)];
    const referred = [box(0, 0), box(100, 0)];
    expect(choosePanel(spots, { shapes, referred })).toBe(spots[2]);
  });

  it('when every spot hides some of it, the one that hides least', () => {
    const referred = [box(0, 0, 20, 20), box(100, 0, 5, 5), box(200, 0, 10, 10)];
    expect(choosePanel(spots, { shapes: [], referred })).toBe(spots[1]);
  });

  it('a hair of difference is no reason to move', () => {
    const shapes = [box(0, 0, 0.1, 1)];
    expect(choosePanel(spots, { shapes, referred: [] })).toBe(spots[0]);
  });

  it('a panel with no spot is a broken caller', () => {
    expect(() => choosePanel([], { shapes: [], referred: [] })).toThrow();
  });
});
