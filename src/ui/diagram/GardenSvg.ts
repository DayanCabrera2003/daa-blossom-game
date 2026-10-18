import type { Translate } from '@services/i18n';
import type { MiniFlower, MiniGarden, MiniSprout, MiniVine } from '@ui/model/miniGarden';
import { targetName } from '@ui/model/diagramTouch';
import { sproutWords, vineWords } from '@ui/model/diagramWords';
import { NO_OVERLAY, type Overlay } from '@ui/model/overlay';
import { overlayOver, overlayStrands, overlayUnder } from './OverlaySvg';
import { pointsOf, shape } from './svgShape';

/**
 * Paints a small garden of the Codex (`ui/model/miniGarden.ts`) in SVG, with the game's look
 * (plan 07, phase 4): sprouts with their little faces, cold blue in the dark and amber with a
 * lantern, a near-black outline round them; dark vines dotted and lit ones solid with a lantern
 * hung at their middle; suns and moons as badges of different shapes, not only colours; folded
 * flowers as a soft outline with their petals. The colours are the classes of `diagram.css`.
 *
 * What the reader may touch carries `data-target` (its `targetName`: `s3`, `v1-2`),
 * can take the keyboard focus and says what it is to a screen reader; the diagram that owns the
 * garden listens for touches and keys on the whole picture.
 */

/** What the reader may touch in the garden, and the words for it. */
export interface GardenSvgOptions {
  /** Whether the sprouts can be touched. */
  readonly sprouts: boolean;
  /** Which vines can be touched. */
  readonly vine: (vine: MiniVine) => boolean;
  readonly t: Translate;
}

/** Nothing can be touched: a garden only looked at. */
export const LOOK_ONLY = { sprouts: false, vine: () => false } as const;

/** Lets an element be touched: focusable, a button for a screen reader, named by `target`. */
function touchable(element: SVGElement, target: string, words: string): void {
  element.setAttribute('class', `${element.getAttribute('class') ?? ''} dg-touchable`.trim());
  element.dataset['target'] = target;
  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', words);
}

/** A flower's outline, and its petals round its middle (one dot each). */
function paintFlower(page: Document, flower: MiniFlower): SVGGElement {
  const group = shape(page, 'g', { class: 'dg-flower-group' });
  group.append(shape(page, 'polygon', { class: 'dg-flower', points: pointsOf(flower.outline) }));
  for (let k = 0; k < flower.petals; k++) {
    const angle = (2 * Math.PI * k) / flower.petals - Math.PI / 2;
    group.append(
      shape(page, 'circle', {
        class: 'dg-petal',
        cx: (flower.centre.x + 4 * Math.cos(angle)).toFixed(1),
        cy: (flower.centre.y + 4 * Math.sin(angle)).toFixed(1),
        r: 1.5,
      }),
    );
  }
  return group;
}

/** A vine, its touch area when it can be touched, and its lantern when lit. */
function paintVine(
  page: Document,
  vine: MiniVine,
  names: readonly string[],
  options: GardenSvgOptions,
): SVGGElement {
  const group = shape(page, 'g', { class: 'dg-vine-group' });
  const ends = { x1: vine.a.x, y1: vine.a.y, x2: vine.b.x, y2: vine.b.y };
  const looks = ['dg-vine', vine.lit && 'dg-lit', vine.chosen && 'dg-chosen'];
  if (vine.inFlower) looks.push('dg-in-flower');
  group.append(shape(page, 'line', { class: looks.filter(Boolean).join(' '), ...ends }));
  if (vine.lantern !== null) {
    const { x, y } = vine.lantern;
    group.append(
      shape(page, 'circle', { class: 'dg-halo', cx: x, cy: y, r: 6 }),
      shape(page, 'rect', { class: 'dg-lantern', x: x - 2.5, y: y - 3, width: 5, height: 6 }),
      shape(page, 'rect', { class: 'dg-lantern-cap', x: x - 1, y: y - 1, width: 2, height: 2 }),
    );
  }
  if (options.vine(vine)) {
    group.append(shape(page, 'line', { class: 'dg-vine-hit', ...ends }));
    const words = vineWords(names[vine.u] ?? '', names[vine.v] ?? '', vine.lit, options.t);
    touchable(group, targetName({ kind: 'vine', u: vine.u, v: vine.v }), words);
  }
  return group;
}

/** Small blocks of pixels of a face, at whole pixels from the sprout's middle. */
function pixels(
  page: Document,
  className: string,
  blocks: readonly number[][],
  x: number,
  y: number,
) {
  return blocks.map(([dx = 0, dy = 0, w = 1, h = 1]) =>
    shape(page, 'rect', { class: className, x: x + dx, y: y + dy, width: w, height: h }),
  );
}

/** The face: asleep in the dark (eyes shut, a sad mouth), happy with a lantern (and cheeks). */
function paintFace(page: Document, sprout: MiniSprout): SVGElement[] {
  const { x, y, lit } = sprout;
  if (!lit) {
    return pixels(
      page,
      'dg-face',
      [
        [-3, 0, 2],
        [2, 0, 2],
        [-1, 3, 3],
        [-2, 4],
        [2, 4],
      ],
      x,
      y,
    );
  }
  return [
    ...pixels(
      page,
      'dg-face',
      [
        [-3, -1, 1, 2],
        [2, -1, 1, 2],
        [-1, 3, 3],
        [-2, 2],
        [2, 2],
      ],
      x,
      y,
    ),
    ...pixels(
      page,
      'dg-cheek',
      [
        [-5, 2, 2],
        [4, 2, 2],
      ],
      x,
      y,
    ),
  ];
}

/** A sun (a disc with four rays) or a moon (a disc with a bite) above the sprout. */
function paintBadge(page: Document, mark: 'sun' | 'moon', x: number, y: number): SVGElement[] {
  if (mark === 'sun') {
    return [
      ...pixels(
        page,
        'dg-sun',
        [
          [-0.5, -4, 1, 2],
          [-0.5, 2, 1, 2],
          [-4, -0.5, 2, 1],
          [2, -0.5, 2, 1],
        ],
        x,
        y,
      ),
      shape(page, 'circle', { class: 'dg-sun', cx: x, cy: y, r: 2 }),
    ];
  }
  return [
    shape(page, 'circle', { class: 'dg-moon', cx: x, cy: y, r: 3 }),
    shape(page, 'circle', { class: 'dg-moon-shade', cx: x + 1.5, cy: y - 1, r: 2 }),
  ];
}

/** A sprout: its body and face, its name, its badge, what is placed on it, and its focus ring. */
function paintSprout(
  page: Document,
  sprout: MiniSprout,
  radius: number,
  options: GardenSvgOptions,
): SVGGElement {
  const { x, y } = sprout;
  const looks = ['dg-sprout', sprout.lit && 'dg-lit', sprout.touched !== null && 'dg-touched'];
  const group = shape(page, 'g', { class: looks.filter(Boolean).join(' ') });
  group.append(shape(page, 'circle', { class: 'dg-ring', cx: x, cy: y, r: radius + 3 }));
  if (sprout.kind === 'bee') {
    for (const side of [-1, 1]) {
      const cx = x + side * (radius - 1);
      group.append(
        shape(page, 'ellipse', { class: 'dg-wing', cx, cy: y - radius + 1, rx: 3, ry: 2.5 }),
      );
    }
  }
  if (sprout.kind === 'flower') {
    // A flower is a diamond, a bee or a sprout a circle: the shape, not the colour, tells them.
    const diamond = (reach: number): string =>
      pointsOf([
        { x, y: y - reach },
        { x: x + reach, y },
        { x, y: y + reach },
        { x: x - reach, y },
      ]);
    group.append(
      shape(page, 'polygon', { class: 'dg-outline', points: diamond(radius + 2.5) }),
      shape(page, 'polygon', { class: 'dg-body', points: diamond(radius + 1) }),
    );
  } else {
    group.append(
      shape(page, 'circle', { class: 'dg-outline', cx: x, cy: y, r: radius + 1 }),
      shape(page, 'circle', { class: 'dg-body', cx: x, cy: y, r: radius }),
    );
  }
  group.append(
    shape(page, 'rect', {
      class: 'dg-glint',
      x: x - radius + 2,
      y: y - radius + 3,
      width: 2,
      height: 1,
    }),
    ...paintFace(page, sprout),
  );
  if (sprout.base) {
    group.append(shape(page, 'circle', { class: 'dg-base', cx: x, cy: y, r: radius + 2 }));
  }
  if (sprout.mark !== null) group.append(...paintBadge(page, sprout.mark, x, y - radius - 3));
  if (sprout.scarecrow) {
    const sx = x + radius + 3;
    group.append(
      shape(page, 'line', { class: 'dg-scarecrow', x1: sx, y1: y - 4, x2: sx, y2: y + 4 }),
      shape(page, 'line', { class: 'dg-scarecrow', x1: sx - 3, y1: y - 1, x2: sx + 3, y2: y - 1 }),
    );
  }
  if (sprout.stone) {
    group.append(
      shape(page, 'rect', {
        class: 'dg-stone',
        x: x - radius - 6,
        y: y - 2,
        width: 5,
        height: 4,
        rx: 1,
      }),
    );
  }
  const name = shape(page, 'text', { class: 'dg-name', x, y: y + radius + 11 });
  name.textContent = sprout.label;
  group.append(name);
  if (options.sprouts) {
    touchable(
      group,
      targetName({ kind: 'sprout', vertex: sprout.vertex }),
      sproutWords(sprout, options.t),
    );
  }
  return group;
}

/**
 * Draws `picture` into `svg`, replacing what was there: ground, the groups a special diagram wraps,
 * flowers, vines and lanterns, its strands, then the sprouts on top and its rings and labels over
 * them. The SVG is one unit per logical pixel; the page scales it by its zoom.
 */
export function drawGarden(
  svg: SVGSVGElement,
  picture: MiniGarden,
  options: GardenSvgOptions,
  overlay: Overlay = NO_OVERLAY,
): void {
  const page = svg.ownerDocument;
  const { width, height } = picture;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.setProperty('--diagram-width', String(width));
  svg.style.setProperty('--diagram-height', String(height));
  const names = picture.sprouts.map((sprout) => sprout.label);
  svg.replaceChildren(
    shape(page, 'rect', { class: 'dg-ground', width, height }),
    ...overlayUnder(page, overlay),
    ...picture.flowers.map((flower) => paintFlower(page, flower)),
    ...picture.vines.map((vine) => paintVine(page, vine, names, options)),
    ...overlayStrands(page, overlay),
    ...picture.sprouts.map((sprout) => paintSprout(page, sprout, picture.radius, options)),
    ...overlayOver(page, overlay, picture.radius),
  );
}

/** A new, empty garden picture, labelled for a screen reader. */
export function gardenSvg(page: Document, label: string): SVGSVGElement {
  const svg = shape(page, 'svg', { class: 'dg-svg', role: 'group', 'aria-label': label });
  return svg;
}
