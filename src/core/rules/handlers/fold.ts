import { contract } from '../../blossom/contract';
import { checkBlossom } from '../../blossom/isBlossom';
import { invariant } from '../../shared/invariant';
import { contractEvent } from '../../trace/contractEvent';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';
import { itemAt } from '../../shared/itemAt';

/**
 * Fold a chosen loop (level 4.4): outside a search, the player may select any odd loop of the
 * garden they see (sprouts or flowers) and fold it, if it really is a flower. During a search,
 * flowers are folded where two suns meet (`foldAt`), so the marks stay meaningful.
 */
export function fold(
  state: GardenState,
  { loop }: Extract<Action, { type: 'fold' }>,
): ActionOutcome {
  const invalid = requireSprouts(state, loop);
  if (invalid) return reject(invalid);
  if (state.search !== null) return reject({ code: 'searchInProgress' });
  const { layer } = state;
  const nodes = loop.map((v) => itemAt(layer.nodeOf, v));
  const checked = checkBlossom(layer.graph, layer.matching, nodes);
  if (!checked.ok) return reject({ code: 'notAFlower', error: checked.error });

  const folded = contract(layer, checked.value);
  const flower = folded.layer.nodes[folded.blossom];
  invariant(flower?.kind === 'blossom', 'a fold must produce a flower');
  return accept({ ...state, layer: folded.layer }, [contractEvent(flower)]);
}
