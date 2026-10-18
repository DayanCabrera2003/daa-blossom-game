import { describe, expect, it } from 'vitest';
import { mountRotateNotice } from './rotateNotice';

/** The few parts of an element the notice touches; tests run without a DOM. */
interface FakeElement {
  textContent: string | null;
  readonly attributes: Record<string, string>;
  readonly style: Record<string, string>;
  readonly children: FakeElement[];
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeElement): FakeElement;
  readonly ownerDocument: { createElement(tag: string): FakeElement };
}

function fakeElement(): FakeElement {
  const element: FakeElement = {
    textContent: null,
    attributes: {},
    style: {},
    children: [],
    setAttribute(name, value) {
      element.attributes[name] = value;
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    ownerDocument: { createElement: () => fakeElement() },
  };
  return element;
}

describe('the notice to turn the phone (plan 09, phase 7)', () => {
  const setUp = () => {
    const host = fakeElement();
    const notice = mountRotateNotice({
      host: host as unknown as HTMLElement,
      text: 'Gira el teléfono para jugar',
    });
    return { notice, layer: host.children[0] };
  };

  it('is put on the page out of sight, with its words, read as a status', () => {
    const { layer } = setUp();
    expect(layer?.textContent).toBe('Gira el teléfono para jugar');
    expect(layer?.attributes['role']).toBe('status');
    expect(layer?.style['display']).toBe('none');
  });

  it('covers the whole window above everything, the books too, while it is shown', () => {
    const { notice, layer } = setUp();
    notice.show(true);
    expect(layer?.style['display']).toBe('grid');
    expect(layer?.style['position']).toBe('fixed');
    expect(layer?.style['inset']).toBe('0');
    // Above the books' layer (10) and the teacher's panel (5).
    expect(Number(layer?.style['zIndex'])).toBeGreaterThan(10);
  });

  it('goes by itself once the phone is turned', () => {
    const { notice, layer } = setUp();
    notice.show(true);
    notice.show(false);
    expect(layer?.style['display']).toBe('none');
  });
});
