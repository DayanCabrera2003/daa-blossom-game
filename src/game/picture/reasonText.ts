import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import type { Refusal } from '../systems/refusal';

/** The sprouts a refused action went through: its chain, stem or loop (empty otherwise). */
const sequenceOf = (action: Action | null): readonly VertexId[] =>
  action === null
    ? []
    : action.type === 'chain'
      ? action.path
      : action.type === 'rotateStem'
        ? action.stem
        : action.type === 'fold'
          ? action.loop
          : [];

/**
 * Why a move was refused, as the player reads it (GDD §2.10: "si es inválido, el juego lo rechaza y
 * explica por qué"): the text of the reason with the names of the sprouts involved. Errors inside a
 * chain or a loop point at a position in it, which is turned back into the sprouts at that spot.
 * A refusal that answers no action (a touch on the drawn reflection) comes with `action` null.
 *
 * While the level does not let loops fold (`foldAllowed` false, as in 4.1), two suns of one tree
 * meeting is told exactly like a sprout already marked: the player's search "leaves it" (3.3), and
 * nothing gives away that the light has just gone wrong, which only 4.2 reveals.
 */
export function reasonText(
  reason: Refusal,
  action: Action | null,
  labels: readonly string[],
  t: Translate,
  { foldAllowed }: { readonly foldAllowed: boolean } = { foldAllowed: true },
): string {
  if (reason.code === 'sunMeetsSun' && !foldAllowed) {
    return reasonText({ code: 'alreadyMarked', vertex: reason.v }, action, labels, t);
  }
  const name = (v: VertexId): string => labels[v] ?? String(v);
  const sequence = sequenceOf(action);
  const at = (index: number): string => name(itemAt(sequence, index % sequence.length));

  switch (reason.code) {
    case 'actionLocked':
      return t('reason.actionLocked', { action: t(`action.${reason.action}`) });
    case 'notAdjacent':
    case 'notLit':
    case 'litVine':
    case 'sunMeetsSun':
    case 'notSunsOfOneTree':
      return t(`reason.${reason.code}`, { u: name(reason.u), v: name(reason.v) });
    case 'alreadyLit':
    case 'notInTheDark':
    case 'notARoot':
    case 'noLanternToPass':
    case 'alreadyInspected':
    case 'vineHidden':
    case 'notASun':
    case 'alreadyMarked':
    case 'alreadyPlaced':
    case 'notPlaced':
    case 'twoSilver':
      return t(`reason.${reason.code}`, { vertex: name(reason.vertex) });
    case 'invalidPath': {
      const error = reason.error;
      const key = `reason.invalidPath.${error.code}`;
      switch (error.code) {
        case 'repeatedVertex':
        case 'endpointNotExposed':
          return t(key, { vertex: name(error.vertex) });
        case 'notAdjacent':
        case 'notAlternating':
          return t(key, { u: at(error.index), v: at(error.index + 1) });
        default:
          return t(key);
      }
    }
    case 'notAFlower': {
      const error = reason.error;
      const key = `reason.notAFlower.${error.code}`;
      switch (error.code) {
        case 'evenLength':
          return t(key, { length: error.length });
        case 'repeatedVertex':
        case 'notAlternating':
          return t(key, { vertex: at(error.index) });
        case 'notAdjacent':
          return t(key, { u: at(error.index), v: at(error.index + 1) });
        default:
          return t(key);
      }
    }
    default:
      return t(`reason.${reason.code}`);
  }
}
