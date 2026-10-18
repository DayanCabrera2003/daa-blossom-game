import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';

/** The few parts of an element the live region uses, so it can be tried without a DOM. */
export interface LiveElement {
  textContent: string | null;
  readonly style: Record<string, string>;
  setAttribute(name: string, value: string): void;
}

/** Where the region goes: an element of the page, which makes it and holds it. */
export interface LiveHost {
  appendChild(child: LiveElement): unknown;
  readonly ownerDocument: { createElement(tag: 'div'): LiveElement };
}

/** What the region needs: the bus the game speaks on, and the page element to put it in. */
export interface LiveRegionOptions {
  readonly bus: Bus<BusEvents>;
  readonly host: LiveHost;
}

/** Out of sight, but read: one pixel, clipped, never wrapping. */
const HIDDEN: Readonly<Record<string, string>> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

/** Added to a message said twice in a row, so the region changes and it is read again. */
const AGAIN = ' ';

/**
 * The page's live region (plan 09, phase 6): an element out of sight with `aria-live="polite"`,
 * where the game writes what a screen reader should say (`a11y.say` on the bus): each line of
 * dialogue whole with who says it, each notice, each question and whether an answer was the one.
 * Each message is written once, whole; one said again right after itself gets an invisible space,
 * since a region whose words do not change is not read again.
 */
export function mountLiveRegion({ bus, host }: LiveRegionOptions): void {
  const region = host.ownerDocument.createElement('div');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  Object.assign(region.style, HIDDEN);
  host.appendChild(region);
  bus.on('a11y.say', ({ text }) => {
    region.textContent = region.textContent === text ? text + AGAIN : text;
  });
}
