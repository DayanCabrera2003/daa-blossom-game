import { contract } from '../../blossom/contract';
import { checkBlossom } from '../../blossom/isBlossom';
import { isExposed } from '../../matching/queries';
import { invariant } from '../../shared/invariant';
import { itemAt } from '../../shared/itemAt';
import { contractEvent } from '../../trace/contractEvent';
import type { Action } from '../actions';
import { requireSprouts } from '../checks';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * Fold a chosen loop («Plegar a mano», free mode only: levels fold where two suns meet, `foldAt`):
 * outside a search, the player may select any odd loop of the garden they see (sprouts or flowers)
 * and fold it, if it really is a flower and its base is in the dark. With a dark base, folding
 * neither makes nor hides a chain (Códex C8); with a lit one it may hide one (Observation 8.4), so
 * it is refused. The check is exact and needs no search for a stem. During a search, flowers are
 * folded where two suns meet, so the marks stay meaningful.
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
  // `checkBlossom` puts the base first.
  if (!isExposed(layer.matching, itemAt(checked.value, 0))) return reject({ code: 'baseNotDark' });

  const folded = contract(layer, checked.value);
  const flower = folded.layer.nodes[folded.blossom];
  invariant(flower?.kind === 'blossom', 'a fold must produce a flower');
  return accept({ ...state, layer: folded.layer }, [contractEvent(flower)]);
}
