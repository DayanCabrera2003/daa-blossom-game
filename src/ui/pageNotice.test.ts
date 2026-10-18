import { describe, expect, it } from 'vitest';
import { mountPageNotice } from './pageNotice';

/** The few parts of an element the notice touches; tests run without a DOM. */
interface FakeElement {
  type: string;
  textContent: string | null;
  readonly attributes: Record<string, string>;
  readonly style: Record<string, string>;
  readonly children: FakeElement[];
  readonly clicks: (() => void)[];
  setAttribute(name: string, value: string): void;
  appendChild(child: FakeElement): FakeElement;
  append(...children: FakeElement[]): void;
  addEventListener(name: string, listener: () => void): void;
  readonly ownerDocument: { createElement(tag: string): FakeElement };
}

function fakeElement(): FakeElement {
  const element: FakeElement = {
    type: '',
    textContent: null,
    attributes: {},
    style: {},
    children: [],
    clicks: [],
    setAttribute(name, value) {
      element.attributes[name] = value;
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    append(...children) {
      element.children.push(...children);
    },
    addEventListener(name, listener) {
      if (name === 'click') element.clicks.push(listener);
    },
    ownerDocument: { createElement: () => fakeElement() },
  };
  return element;
}

/** The notice mounted on a fake page, with what it is made of. */
function mounted() {
  const host = fakeElement();
  let reloads = 0;
  const notice = mountPageNotice({
    host: host as unknown as HTMLElement,
    words: { close: 'Cerrar', reload: 'Recargar' },
    reload: () => (reloads += 1),
  });
  const box = host.children[0] as FakeElement;
  const [text, reload, close] = box.children as [FakeElement, FakeElement, FakeElement];
  return { notice, box, text, reload, close, reloads: () => reloads };
}

describe("the page's notice", () => {
  it('waits out of sight, as an alert a screen reader reads at once', () => {
    const { box } = mounted();
    expect(box.style.display).toBe('none');
    expect(box.attributes.role).toBe('alert');
  });

  it('says its words with a way to reload when that helps, and closes', () => {
    const { notice, box, text, reload, close, reloads } = mounted();
    notice.show('Hay una versión nueva del jardín.', true);
    expect(box.style.display).toBe('block');
    expect(text.textContent).toBe('Hay una versión nueva del jardín.');
    expect(reload.textContent).toBe('Recargar');
    expect(reload.style.display).toBe('');
    reload.clicks.forEach((press) => press());
    expect(reloads()).toBe(1);
    expect(close.textContent).toBe('Cerrar');
    close.clicks.forEach((press) => press());
    expect(box.style.display).toBe('none');
  });

  it('without the way to reload when it would not help, and never sends a form', () => {
    const { notice, reload, close } = mounted();
    notice.show('Este navegador no deja guardar.', false);
    expect(reload.style.display).toBe('none');
    expect([reload.type, close.type]).toEqual(['button', 'button']);
  });

  it('a new notice replaces the one shown; hidden, it is out of sight again', () => {
    const { notice, box, text } = mounted();
    notice.show('uno', false);
    notice.show('dos', true);
    expect(text.textContent).toBe('dos');
    notice.hide();
    expect(box.style.display).toBe('none');
  });
});
