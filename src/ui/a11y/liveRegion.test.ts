import { createBus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { describe, expect, it } from 'vitest';
import { mountLiveRegion, type LiveHost } from './liveRegion';

/** The few parts of an element the region touches; tests run without a DOM. */
interface FakeElement {
  textContent: string | null;
  readonly attributes: Record<string, string>;
  readonly style: Record<string, string>;
  readonly children: FakeElement[];
  /** Every text written into it, in order. */
  readonly writes: string[];
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeElement): FakeElement;
}

function fakeElement(): FakeElement {
  let text: string | null = null;
  const element: FakeElement = {
    get textContent() {
      return text;
    },
    set textContent(value) {
      text = value;
      if (value !== null) element.writes.push(value);
    },
    attributes: {},
    style: {},
    children: [],
    writes: [],
    setAttribute: (name, value) => {
      element.attributes[name] = value;
    },
    appendChild: (child) => {
      element.children.push(child);
      return child;
    },
  };
  return element;
}

const fakeHost = (): FakeElement & LiveHost => {
  const host = fakeElement();
  return Object.assign(host, { ownerDocument: { createElement: () => fakeElement() } });
};

describe('the live region a screen reader listens to (plan 09, phase 6)', () => {
  it('is a polite, whole-message region, out of sight but not out of the page', () => {
    const host = fakeHost();
    mountLiveRegion({ bus: createBus<BusEvents>(), host });
    const [region] = host.children;
    expect(region?.attributes['aria-live']).toBe('polite');
    expect(region?.attributes['aria-atomic']).toBe('true');
    expect(region?.style.position).toBe('absolute');
    expect(region?.style.width).toBe('1px');
    expect(region?.style.overflow).toBe('hidden');
  });

  it('writes each message once, whole, as the game says it', () => {
    const bus = createBus<BusEvents>();
    const host = fakeHost();
    mountLiveRegion({ bus, host });
    const region = host.children[0];
    bus.emit('a11y.say', { text: 'Sauce: Hola, jardinero.' });
    bus.emit('a11y.say', { text: 'Respuesta acertada.' });
    expect(region?.writes).toEqual(['Sauce: Hola, jardinero.', 'Respuesta acertada.']);
  });

  it('says a message again when it comes again, by changing it invisibly', () => {
    const bus = createBus<BusEvents>();
    const host = fakeHost();
    mountLiveRegion({ bus, host });
    const region = host.children[0];
    bus.emit('a11y.say', { text: 'No era esa respuesta.' });
    bus.emit('a11y.say', { text: 'No era esa respuesta.' });
    expect(region?.writes).toHaveLength(2);
    expect(region?.writes[0]).not.toBe(region?.writes[1]);
    expect(region?.writes[1]?.trim()).toBe('No era esa respuesta.');
  });
});
