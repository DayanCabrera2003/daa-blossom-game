import type { VertexId } from '@core/graph/types';
import type { Translate } from '@services/i18n';
import type { TraceEvent } from '@core/trace/events';

/**
 * What a step of a replayed day says under the garden (plan 07, phase 4): each event of the trace
 * told in the garden's words, with the names of its sprouts. The texts live in `strings.json`
 * (`diagram.event.*`); this module only picks the key and fills its gaps.
 */

/** A text to look up: its key and the values of its gaps. */
export interface TextRef {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/** The text of one event, sprouts named by `names`. */
export function eventText(event: TraceEvent, names: readonly string[]): TextRef {
  const name = (v: VertexId): string => names[v] ?? String(v);
  const path = (sprouts: readonly VertexId[]): string => sprouts.map(name).join('–');
  const text = (key: string, params: TextRef['params'] = {}): TextRef => ({
    key: `diagram.event.${key}`,
    params,
  });
  switch (event.type) {
    case 'searchStart':
      return event.roots.length === 0
        ? text('searchStartNone')
        : text('searchStart', { roots: event.roots.map(name).join(', ') });
    case 'labelOuter':
      return event.parent === null
        ? text('root', { vertex: name(event.vertex) })
        : text('labelOuter', { vertex: name(event.vertex), parent: name(event.parent) });
    case 'labelInner':
      return text('labelInner', { vertex: name(event.vertex), parent: name(event.parent) });
    case 'scanEdge':
      return text('scanEdge', { from: name(event.from), to: name(event.to) });
    case 'oddCycleFound':
      return text('oddCycleFound', { u: name(event.vine[0]), v: name(event.vine[1]) });
    case 'contract':
      return text('contract', { petals: event.cycle.length, base: name(event.base) });
    case 'expand':
    case 'searchFailed':
    case 'searchCleared':
    case 'declareDone':
      return text(event.type);
    case 'augment':
    case 'chainFound':
      return text(event.type, { path: path(event.path) });
    case 'done':
      return text('done', { count: event.size });
    case 'light':
    case 'putOut':
      return text(event.type, { u: name(event.u), v: name(event.v) });
    case 'inspect':
      return text('inspect', { vertex: name(event.vertex) });
    case 'scarecrow':
      return text(event.placed ? 'scarecrowPlaced' : 'scarecrowRemoved', {
        vertex: name(event.vertex),
      });
    case 'stone':
      return text(event.lifted ? 'stoneLifted' : 'stoneDropped', { vertex: name(event.vertex) });
  }
}

/** What a step says: dawn before anything happens, then its events one after another. */
export function stepText(
  events: readonly TraceEvent[],
  names: readonly string[],
  t: Translate,
): string {
  if (events.length === 0) return t('diagram.dawn');
  return events
    .map((event) => {
      const { key, params } = eventText(event, names);
      return t(key, params);
    })
    .join(' ');
}
