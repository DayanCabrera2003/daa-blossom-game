import type { TraceEventType } from '@core/trace/events';

/**
 * Every template of the teacher's notation (`content/<locale>/notation.json`, plan 07, phase 12)
 * with the `{gaps}` it fills, already written in TeX by `traceNotation.ts`. Each kind of trace
 * event lists the templates it is written with (a root and any other sun read differently), with
 * `satisfies Record<TraceEventType, …>`, so TypeScript fails here if the core adds an event without
 * its notation. A test checks every locale against these lists: nothing missing, nothing left over,
 * the same gaps.
 */

type Gaps = readonly string[];

/** The templates of each kind of event. */
export const EVENT_NOTATION = {
  searchStart: { searchStart: ['roots'], searchStartNone: [] },
  labelOuter: { labelRoot: ['v'], labelOuter: ['v', 'parent', 'root'] },
  labelInner: { labelInner: ['v', 'parent', 'root'] },
  scanEdge: { scanEdge: ['edge'] },
  oddCycleFound: { oddCycleFound: ['edge'] },
  contract: { contract: ['flower', 'cycle', 'base'] },
  expand: { expand: ['flower'] },
  augment: { augment: ['path'] },
  searchFailed: { searchFailed: [] },
  done: { done: ['size'] },
  light: { light: ['edge'] },
  putOut: { putOut: ['edge'] },
  inspect: { inspect: ['v', 'set'] },
  chainFound: { chainFound: ['path'] },
  searchCleared: { searchCleared: [] },
  scarecrow: { scarecrowPlaced: ['v'], scarecrowRemoved: ['v'] },
  stone: { stoneLifted: ['v'], stoneDropped: ['v'] },
  declareDone: { declareDone: [] },
} as const satisfies Record<TraceEventType, Readonly<Record<string, Gaps>>>;

/** The templates of the certificate that closes a run of Edmonds (Theorem 12.3, $U=I$). */
export const CERTIFICATE_NOTATION = {
  'certificate.stones': ['set'],
  'certificate.count': ['n', 'stones', 'groups'],
  'certificate.bound': ['n', 'stones', 'groups', 'bound'],
  'certificate.tight': ['size', 'bound'],
} as const satisfies Readonly<Record<string, Gaps>>;

/** Every template of the notation with its gaps. */
export const NOTATION_KEYS: Readonly<Record<string, Gaps>> = Object.assign(
  {},
  ...Object.values(EVENT_NOTATION),
  CERTIFICATE_NOTATION,
) as Readonly<Record<string, Gaps>>;

/** The key of a template of the notation. */
export type NotationKey =
  | {
      [Type in keyof typeof EVENT_NOTATION]: keyof (typeof EVENT_NOTATION)[Type];
    }[keyof typeof EVENT_NOTATION]
  | keyof typeof CERTIFICATE_NOTATION;
