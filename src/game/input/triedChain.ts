import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import type { Target } from './target';

/**
 * The chain a refused drag tried: the chain dragged so far and the sprout under the pointer it was
 * refused at. The reason of the refusal points at positions in this sequence, so the toast can name
 * the sprouts where the chain went wrong.
 */
export const triedChain = (chain: readonly VertexId[] | null, target: Target): Action => ({
  type: 'chain',
  path: [...(chain ?? []), ...(target.kind === 'sprout' ? [target.vertex] : [])],
});
