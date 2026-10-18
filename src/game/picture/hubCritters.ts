import { invariant } from '@core/shared/invariant';
import { FRAMES, frameIndex, type FrameName } from '../assets/frames';
import { assetEntry, type AssetKey } from '../assets/keys';
import type { Rect } from './boxDistance';
import type { Size } from './freeSpot';

/**
 * The animals of the hub's cosmetics (plan 08, section 1.2) and how each moves inside its home, a
 * box of the hub kept clear of everything else: the butterflies fly a closed loop across theirs,
 * the cat dozes at one end and now and then walks to the other, the hens peck and stroll the same
 * way, and the frog sits and hops in place. Every move is slow and small. Pure: the same instant
 * always gives the same pose, so the view only asks and draws.
 */

/** The animals, in the order their homes are found (`hubCosmeticHomes.ts`). */
export const CRITTERS = [
  'frog',
  'cat',
  'chickenWhite',
  'chickenBrown',
  'butterfly',
  'butterflyBlue',
] as const;

export type CritterId = (typeof CRITTERS)[number];

/** The side of a frame of every animal's sheet. */
export const CRITTER_SIZE = 16;

/**
 * The home each animal needs: one frame for the frog, room to stroll a frame's width for the cat
 * and the hens, and room to loop for the butterflies.
 */
export const CRITTER_HOME: Readonly<Record<CritterId, Size>> = {
  frog: { width: 16, height: 16 },
  cat: { width: 32, height: 16 },
  chickenWhite: { width: 32, height: 16 },
  chickenBrown: { width: 32, height: 16 },
  butterfly: { width: 48, height: 24 },
  butterflyBlue: { width: 48, height: 24 },
};

/** How long a butterfly takes to fly once round its loop, in milliseconds. */
export const FLIGHT_MS = { butterfly: 9000, butterflyBlue: 11_000 } as const;

/** Where a butterfly starts its loop, as an angle, so the two never beat in step. */
const FLIGHT_PHASE = { butterfly: 0, butterflyBlue: 2 } as const;

/** How long a wingbeat's frame shows. */
const WING_MS = 120;

/**
 * How a strolling animal paces: the length of its round (rest at the left, walk right, rest at
 * the right, walk back), where in the round it starts, and the share of the round each rest takes.
 */
const PACE = {
  cat: { round: 20_000, start: 0, rest: 0.4 },
  chickenWhite: { round: 12_000, start: 0, rest: 0.35 },
  chickenBrown: { round: 14_000, start: 5000, rest: 0.35 },
} as const;

/** How long each frame of a step shows while walking. */
const STEP_MS = 200;

/** A hen pecks (its second frame) for one beat of `PECK_MS` in every three while it rests. */
const PECK_MS = 700;

/** The frog hops for `HOP_MS` once every `HOP_EVERY_MS`. */
const HOP_MS = 400;
const HOP_EVERY_MS = 5000;

/** How an animal shows at an instant: which frame of which sheet, where, and whether mirrored. */
export interface CritterPose {
  readonly sheet: AssetKey;
  readonly frame: number;
  /** The top-left corner of its frame on the canvas. */
  readonly x: number;
  readonly y: number;
  /** Whether it is drawn mirrored, facing left (the sheets face right). */
  readonly flipX: boolean;
}

/** `value` modulo `size`, never negative. */
const wrap = (value: number, size: number): number => ((value % size) + size) % size;

/** The number of a frame `rows` rows below the top cell of the named column `name`. */
function cellOf(name: FrameName, rows: number): number {
  const { col, row, sheet } = FRAMES[name];
  const { image, frame } = assetEntry(sheet);
  invariant(image !== undefined && frame !== undefined, `${sheet} is not a sheet`);
  return (row + rows) * (image.width / frame.width) + col;
}

/** A butterfly on its loop, a figure of eight that crosses its home once each way per lap. */
function fly(id: 'butterfly' | 'butterflyBlue', home: Rect, now: number): CritterPose {
  const angle = (2 * Math.PI * wrap(now, FLIGHT_MS[id])) / FLIGHT_MS[id] + FLIGHT_PHASE[id];
  const spanX = (home.width - CRITTER_SIZE) / 2;
  const spanY = (home.height - CRITTER_SIZE) / 2;
  const right = Math.cos(angle) >= 0;
  const facing: FrameName =
    id === 'butterfly'
      ? right
        ? 'butterflyRight'
        : 'butterflyLeft'
      : right
        ? 'butterflyBlueRight'
        : 'butterflyBlueLeft';
  return {
    sheet: FRAMES[facing].sheet,
    frame: cellOf(facing, Math.floor(wrap(now, 4 * WING_MS) / WING_MS)),
    x: home.x + Math.round(spanX * (1 + Math.sin(angle))),
    y: home.y + Math.round(spanY * (1 + Math.sin(2 * angle))),
    flipX: false,
  };
}

/** A cat or a hen strolling between the two ends of its home, resting at each. */
function stroll(id: 'cat' | 'chickenWhite' | 'chickenBrown', home: Rect, now: number): CritterPose {
  const { round, start, rest } = PACE[id];
  const share = wrap(now + start, round) / round;
  const span = home.width - CRITTER_SIZE;
  const walk = 0.5 - rest;
  // Where it is along its home (0 at the left, 1 at the right), and whether it is walking.
  let along: number;
  let walking = true;
  let left: boolean;
  if (share < rest) {
    [along, walking, left] = [0, false, true];
  } else if (share < 0.5) {
    [along, left] = [(share - rest) / walk, false];
  } else if (share < 0.5 + rest) {
    [along, walking, left] = [1, false, false];
  } else {
    [along, left] = [1 - (share - 0.5 - rest) / walk, true];
  }
  const still: FrameName =
    id === 'cat' ? 'catStill' : id === 'chickenWhite' ? 'chickenWhiteStill' : 'chickenBrownStill';
  const moving: FrameName =
    id === 'cat' ? 'catWalk' : id === 'chickenWhite' ? 'chickenWhiteWalk' : 'chickenBrownWalk';
  // Walking, its two frames take turns; resting, the cat dozes and a hen pecks now and then.
  const second = walking
    ? Math.floor(wrap(now, 2 * STEP_MS) / STEP_MS) === 1
    : id !== 'cat' && Math.floor(wrap(now + start, 3 * PECK_MS) / PECK_MS) === 0;
  return {
    sheet: FRAMES[still].sheet,
    frame: frameIndex(second ? moving : still),
    x: home.x + Math.round(span * along),
    y: home.y + home.height - CRITTER_SIZE,
    flipX: left,
  };
}

/** How the animal `id` shows at the instant `now` (in milliseconds) in its home `home`. */
export function critterPose(id: CritterId, home: Rect, now: number): CritterPose {
  switch (id) {
    case 'butterfly':
    case 'butterflyBlue':
      return fly(id, home, now);
    case 'frog': {
      const hopping = wrap(now, HOP_EVERY_MS) < HOP_MS;
      return {
        sheet: FRAMES.frogStill.sheet,
        frame: frameIndex(hopping ? 'frogHop' : 'frogStill'),
        x: home.x,
        y: home.y + home.height - CRITTER_SIZE,
        flipX: false,
      };
    }
    default:
      return stroll(id, home, now);
  }
}
