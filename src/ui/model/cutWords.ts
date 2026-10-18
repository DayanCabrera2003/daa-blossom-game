import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import type { CutSession } from './cutPlay';
import { refusalText } from './refusalText';

/**
 * What the cut at the flower of C8 says under its gardens (plan 07, phase 5): how to start, to go
 * on until a sprout in the dark, why a drawing is no chain (the game's own words), and, for a
 * chain, the argument of the flower lemma on it: it leaves the flower at one end, and its stretch
 * up to the first petal reaches the flower by a dark vine, so folded it is a chain to the flower.
 */
export function cutWords(session: CutSession, names: readonly string[], t: Translate): string {
  const name = (v: VertexId): string => names[v] ?? String(v);
  const path = (sprouts: readonly VertexId[]): string => sprouts.map(name).join('–');
  const { result, drawn } = session;
  if (result === null) return t(drawn.length === 0 ? 'diagram.cut.start' : 'diagram.cut.drawing');
  if (result.kind === 'notAChain') {
    const reason = { code: 'invalidPath', error: result.error } as const;
    return refusalText({ reason, action: { type: 'chain', path: drawn } }, names, t);
  }
  const { cut } = result;
  if (cut.petal === null) return t('diagram.cut.away', { chain: path(cut.chain) });
  return t('diagram.cut.stretch', {
    chain: path(cut.chain),
    outside: name(itemAt(cut.chain, 0)),
    stretch: path(cut.stretch),
  });
}
