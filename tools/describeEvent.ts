// Turns trace events into readable lines, with sprout names, for the solve tool.
import type { VertexId } from '@core/graph/types';
import type { NodeRef, TraceEvent } from '@core/trace/events';

/** Names a sprout: a level label, or the id itself for an unnamed garden. */
export type Namer = (v: VertexId) => string;

const chain = (path: readonly VertexId[], name: Namer): string => path.map(name).join('–');
const child = (ref: NodeRef, name: Namer): string =>
  ref.kind === 'sprout' ? name(ref.vertex) : `#${ref.id}`;

/** One readable line for one event of a trace. */
export function describeEvent(event: TraceEvent, name: Namer): string {
  switch (event.type) {
    case 'searchStart':
      return event.roots.length === 0
        ? 'search starts: every sprout already has a lantern'
        : `search starts from the dark: ${event.roots.map(name).join(', ')}`;
    case 'labelOuter':
      return event.parent === null
        ? `sun on ${name(event.vertex)} (a root)`
        : `sun on ${name(event.vertex)} (lantern partner of ${name(event.parent)})`;
    case 'labelInner':
      return `moon on ${name(event.vertex)} (reached from ${name(event.parent)})`;
    case 'scanEdge':
      return `look ${name(event.from)} → ${name(event.to)}`;
    case 'oddCycleFound':
      return `suns ${name(event.vine[0])} and ${name(event.vine[1])} of one tree meet: a flower`;
    case 'contract':
      return `fold flower #${event.blossom} (base ${name(event.base)}): ${event.cycle.map((ref) => child(ref, name)).join(', ')}`;
    case 'expand':
      return `open flower #${event.blossom}`;
    case 'augment':
      return `pass the lanterns along ${chain(event.path, name)}`;
    case 'searchFailed':
      return 'no chain left: the lanterns are the most possible';
    case 'done':
      return `done: ${event.size} lanterns`;
    case 'light':
      return `light a lantern ${name(event.u)}–${name(event.v)}`;
    case 'putOut':
      return `put out the lantern ${name(event.u)}–${name(event.v)}`;
    case 'inspect':
      return `inspect ${name(event.vertex)}: vines to ${event.vines.map(name).join(', ')}`;
    case 'chainFound':
      return `chain found: ${chain(event.path, name)}`;
    case 'searchCleared':
      return 'the lanterns changed: the marks are wiped';
    case 'scarecrow':
      return `scarecrow ${event.placed ? 'on' : 'off'} ${name(event.vertex)}`;
    case 'stone':
      return event.lifted
        ? `lift the stone on ${name(event.vertex)}`
        : `put back the stone on ${name(event.vertex)}`;
    case 'declareDone':
      return '"Terminé"';
  }
}
