import { describe, expect, it } from 'vitest';
import { hitZone, touchRoom } from '../src/game/input/hitPadding';
import type { Rect } from '../src/game/picture/boxDistance';
import { estimatedButtonWidth } from '../src/game/picture/bottomRows';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  cssPixel,
  integerZoom,
  MIN_CSS_PIXEL,
} from '../src/game/scale/integerZoom';
import { asksToTurn } from '../src/game/scale/orientation';
import { PANEL_LINE, PANEL_WIDTH, panelPixel, panelRoom } from '../src/game/scale/panelRoom';
import { LAYOUT } from '../src/game/view/layout';
import { catalog } from '../src/levels/catalog';
import { BOOK, pageArea } from '../src/ui/model/bookLayout';
import { hudBoxes } from './support/hudBoxes';
import { hubOf, t } from './support/hubBoxes';
import { hubSpots, STATES } from './support/hubSpots';

// Small screens and touch (plan 09, phase 7), with the real canvas sizes: phones in both
// orientations, a tablet, laptops and desktops, at their densities. For each, the whole zoom in
// device pixels, the canvas in CSS pixels (never bigger than the window), the smallest button, the
// notice to turn a phone held upright, the teacher's panel and the books; and on a phone held
// sideways, the grown touch zones of every button of the hub and of each level's HUD.

/** A screen: its window in CSS pixels, its density, and what the game should make of it. */
interface Screen {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly density: number;
  /** The whole zoom in device pixels. */
  readonly zoom: number;
  /** Whether the game asks to turn the phone. */
  readonly turn: boolean;
  /** Whether the teacher's panel fits beside the canvas. */
  readonly panel: boolean;
}

const SCREENS: readonly Screen[] = [
  {
    name: 'phone 360×800 upright',
    width: 360,
    height: 800,
    density: 3,
    zoom: 2,
    turn: true,
    panel: false,
  },
  {
    name: 'phone 800×360 sideways',
    width: 800,
    height: 360,
    density: 3,
    zoom: 4,
    turn: false,
    panel: true,
  },
  {
    name: 'phone 360×640 upright',
    width: 360,
    height: 640,
    density: 3,
    zoom: 2,
    turn: true,
    panel: false,
  },
  {
    name: 'phone 640×360 sideways',
    width: 640,
    height: 360,
    density: 3,
    zoom: 4,
    turn: false,
    panel: false,
  },
  {
    name: 'phone 390×844 upright',
    width: 390,
    height: 844,
    density: 3,
    zoom: 2,
    turn: true,
    panel: false,
  },
  {
    name: 'phone 844×390 sideways',
    width: 844,
    height: 390,
    density: 3,
    zoom: 4,
    turn: false,
    panel: true,
  },
  {
    name: 'phone 412×915 upright',
    width: 412,
    height: 915,
    density: 2.625,
    zoom: 2,
    turn: true,
    panel: false,
  },
  {
    name: 'phone 915×412 sideways',
    width: 915,
    height: 412,
    density: 2.625,
    zoom: 4,
    turn: false,
    panel: true,
  },
  {
    name: 'tablet 768×1024 upright',
    width: 768,
    height: 1024,
    density: 2,
    zoom: 3,
    turn: false,
    panel: false,
  },
  {
    name: 'tablet 1024×768 sideways',
    width: 1024,
    height: 768,
    density: 2,
    zoom: 4,
    turn: false,
    panel: true,
  },
  {
    name: 'laptop 1280×720',
    width: 1280,
    height: 720,
    density: 1,
    zoom: 2,
    turn: false,
    panel: true,
  },
  {
    name: 'laptop 1366×768',
    width: 1366,
    height: 768,
    density: 1,
    zoom: 2,
    turn: false,
    panel: true,
  },
  {
    name: 'desktop 1440×810',
    width: 1440,
    height: 810,
    density: 1,
    zoom: 3,
    turn: false,
    panel: true,
  },
  {
    name: 'desktop 1920×1080',
    width: 1920,
    height: 1080,
    density: 1,
    zoom: 4,
    turn: false,
    panel: true,
  },
  {
    name: 'desktop 2560×1440',
    width: 2560,
    height: 1440,
    density: 1,
    zoom: 5,
    turn: false,
    panel: true,
  },
  {
    name: '4K at density 2',
    width: 1920,
    height: 1080,
    density: 2,
    zoom: 8,
    turn: false,
    panel: true,
  },
  {
    name: '4K at density 1.5',
    width: 2560,
    height: 1440,
    density: 1.5,
    zoom: 8,
    turn: false,
    panel: true,
  },
];

/** The narrowest button of the game: the help's "?" on its wood. */
const NARROWEST = estimatedButtonWidth(t('hud.help'));

describe.each(SCREENS)('$name at density $density', (screen) => {
  const { width, height, density } = screen;
  const zoom = integerZoom(width, height, density);
  const pixel = cssPixel(zoom, density);

  it('draws the canvas at its whole zoom in device pixels, never bigger than the window', () => {
    expect(zoom).toBe(screen.zoom);
    expect(CANVAS_WIDTH * pixel).toBeLessThanOrEqual(width + 1e-9);
    expect(CANVAS_HEIGHT * pixel).toBeLessThanOrEqual(height + 1e-9);
  });

  it('asks to turn the phone only when it is held upright and the game would be too small', () => {
    expect(asksToTurn(width, height, density)).toBe(screen.turn);
    // Played, the smallest button is at least as big as at ×1 on a computer.
    if (!screen.turn) {
      expect(BUTTON_HEIGHT * pixel).toBeGreaterThanOrEqual(BUTTON_HEIGHT * MIN_CSS_PIXEL);
      expect(NARROWEST * pixel).toBeGreaterThanOrEqual(NARROWEST * MIN_CSS_PIXEL);
    }
  });

  it("offers the teacher's panel only where it fits beside a canvas at ×1 or more", () => {
    const room = panelRoom(width, height, true, density);
    expect(room.fits).toBe(screen.panel);
    if (!room.fits) {
      expect(room).toEqual({ zoom, panel: 0, fits: false });
      return;
    }
    const unit = panelPixel(room, density);
    expect(cssPixel(room.zoom, density)).toBeGreaterThanOrEqual(MIN_CSS_PIXEL);
    expect(room.panel).toBeGreaterThanOrEqual(PANEL_WIDTH.min);
    expect(CANVAS_WIDTH * cssPixel(room.zoom, density) + room.panel).toBeLessThanOrEqual(width);
    // A line of the panel holds its letters, inside its padding and its wooden edge.
    expect(Math.floor((room.panel - 11 * unit) / (6 * unit))).toBeGreaterThanOrEqual(PANEL_LINE);
  });

  it('opens the books whole over the canvas, at its pixel', () => {
    if (screen.turn) return;
    // The window in the books' logical pixels (`--zoom` is the canvas's CSS pixel).
    const view = { width: width / pixel, height: height / pixel };
    expect(view.width).toBeGreaterThanOrEqual(BOOK.width);
    expect(view.height).toBeGreaterThanOrEqual(BOOK.height);
    expect(pageArea(view)).toEqual(pageArea({ width: BOOK.width, height: BOOK.height }));
  });
});

/** Whether two boxes share some area. */
const overlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * The smallest CSS pixel of a phone held sideways in the table: ×4 at density 3, 4/3 of a CSS
 * pixel. A dense phone gives at least this.
 */
const PHONE_PIXEL = Math.min(
  ...SCREENS.filter((s) => s.name.startsWith('phone') && !s.turn).map((s) =>
    cssPixel(integerZoom(s.width, s.height, s.density), s.density),
  ),
);

/**
 * The least a touch zone may measure on its narrower side on a phone held sideways, in CSS pixels.
 * On the hub, the 24 CSS pixels of WCAG 2.5.8 (target size, minimum). The HUD of a level cannot
 * reach them without being laid out anew (two rows of 14-pixel buttons that touch, 2 to 3 pixels
 * apart): the zones there are held to the 16 CSS pixels its layout allows, the narrowest button
 * ("?", 10 pixels) with half of each gap, against the 13 of its bare wood.
 */
const TOUCH_MINIMUM = { hub: 24, hud: 16 } as const;

/** The garden of a level, where the zones never reach. */
const GARDEN: Rect = {
  x: 0,
  y: LAYOUT.garden.y,
  width: CANVAS_WIDTH,
  height: LAYOUT.garden.height,
};

/** The grown zone of each box among `boxes`, with the others as its neighbours. */
const zonesOf = (boxes: readonly Rect[], kept: readonly Rect[]): Rect[] =>
  boxes.map((box) =>
    hitZone(
      box,
      touchRoom(
        { box, depth: 100 },
        boxes.filter((other) => other !== box).map((other) => ({ box: other, depth: 100 })),
        [],
        kept,
      ),
    ),
  );

describe('the touch zones on a phone held sideways', () => {
  it('a dense phone shows a logical pixel as 4/3 of a CSS pixel at least', () => {
    expect(PHONE_PIXEL).toBeCloseTo(4 / 3);
  });

  it.each(STATES)('the hub ($name): every zone is big enough and none meets another', (state) => {
    const spots = hubSpots(state.save, state.teacher);
    // Every level's button is drawn, open or not: a zone never grows over a locked one.
    const levels = hubOf(state.teacher).pressables.levels.map(({ box }) => box);
    const key = (box: Rect): string => `${box.x},${box.y},${box.width},${box.height}`;
    const boxes = [
      ...new Map([...spots.map((spot) => spot.box), ...levels].map((box) => [key(box), box])),
    ].map(([, box]) => box);
    const zones = zonesOf(boxes, []);
    const small: string[] = [];
    zones.forEach((zone, i) => {
      const spot = spots.find((one) => key(one.box) === key(boxes[i] ?? one.box));
      // The flowers are pictures, not buttons: they keep their own box.
      if (spot?.id.startsWith('flower ') === true) return;
      const side = Math.min(zone.width, zone.height) * PHONE_PIXEL;
      if (side < TOUCH_MINIMUM.hub) small.push(`${spot?.id ?? 'locked'}: ${side.toFixed(1)}`);
      zones.forEach((other, j) => expect(j === i || !overlap(zone, other)).toBe(true));
    });
    expect(small).toEqual([]);
  });

  it.each(catalog().map((level) => [level.data.id, level] as const))(
    'the HUD of %s: every zone is big enough, none meets another, none reaches the garden',
    (_, level) => {
      for (const teacher of [false, true]) {
        const buttons = hudBoxes(level, teacher);
        const zones = zonesOf(
          buttons.map(({ box }) => box),
          [GARDEN],
        );
        const small: string[] = [];
        zones.forEach((zone, i) => {
          const side = Math.min(zone.width, zone.height) * PHONE_PIXEL;
          if (side < TOUCH_MINIMUM.hud) small.push(`${buttons[i]?.id ?? ''}: ${side.toFixed(1)}`);
          expect(overlap(zone, GARDEN)).toBe(false);
          zones.forEach((other, j) => expect(j === i || !overlap(zone, other)).toBe(true));
        });
        expect(small).toEqual([]);
      }
    },
  );
});
