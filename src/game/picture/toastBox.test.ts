import { describe, expect, it } from 'vitest';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { PANEL } from './panelLayout';
import { TOAST, toastBox } from './toastBox';

describe('the wooden panel of a toast', () => {
  it('wraps its text a panel and a border short of the canvas on each side', () => {
    expect(TOAST.wrap).toBe(CANVAS_WIDTH - 4 * PANEL.pad);
  });

  it('is centred across the canvas, its border round the text', () => {
    const box = toastBox(100, 12);
    expect(box.width).toBe(100 + 2 * PANEL.pad);
    expect(box.x).toBe(Math.round((CANVAS_WIDTH - box.width) / 2));
    expect(box.height).toBe(12 + 2 * PANEL.pad - 4);
  });

  it('ends above the toolbar, so a longer message grows upwards and never over the tools', () => {
    const one = toastBox(100, 12);
    const three = toastBox(100, 36);
    expect(one.y + one.height).toBe(TOAST.bottom);
    expect(three.y + three.height).toBe(TOAST.bottom);
    expect(three.y).toBeLessThan(one.y);
  });

  it('ends where it is told, above a drawer, and centres its text in itself', () => {
    const box = toastBox(100, 24, 200);
    expect(box.y + box.height).toBe(200);
    expect(box.textY).toBe(box.y + box.height / 2);
  });
});
